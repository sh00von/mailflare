import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import {
	getStripeConfig,
	mapStripeSubscriptionStatus,
	resolvePlanFromStripePriceOrMetadata,
	verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";
import { getEnv } from "@/lib/cloudflare";

type StripeEvent = {
	id: string;
	type: string;
	data: { object: Record<string, unknown> };
};

export async function POST(request: Request) {
	const env = getEnv();
	const config = getStripeConfig(env);
	if (!config?.webhookSecret) {
		return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
	}

	const rawBody = await request.text();
	const signature = request.headers.get("stripe-signature");
	const valid = await verifyStripeWebhookSignature(rawBody, signature, config.webhookSecret);
	if (!valid) {
		return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
	}

	let event: StripeEvent;
	try {
		event = JSON.parse(rawBody) as StripeEvent;
	} catch {
		return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
	}

	const db = getDb(env);
	const obj = event.data?.object ?? {};
	const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
	const now = new Date();

	// Delayed methods (bank debits) complete the session before money moves; their
	// subscription events activate the workspace once Stripe reports it paid.
	if (event.type === "checkout.session.completed" && obj.payment_status !== "paid" && obj.payment_status !== "no_payment_required") {
		return NextResponse.json({ received: true, pending: true });
	} else if (event.type === "checkout.session.completed") {
		const workspaceId = typeof metadata.workspaceId === "string" ? metadata.workspaceId : null;
		const customerId = typeof obj.customer === "string" ? obj.customer : null;
		const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;
		const plan = resolvePlanFromStripePriceOrMetadata(env, metadata.plan, null);
		const rawMailboxes = metadata.mailboxes ? Number(metadata.mailboxes) : null;
		const maxMailboxes = rawMailboxes && rawMailboxes >= 5 ? rawMailboxes : undefined;
		const billingCycle = typeof metadata.cycle === "string" ? metadata.cycle : undefined;
		if (workspaceId) {
			await db
				.update(workspaces)
				.set({
					...(plan ? { plan } : {}),
					...(maxMailboxes ? { maxMailboxes } : {}),
					...(billingCycle ? { billingCycle } : {}),
					...(customerId ? { stripeCustomerId: customerId } : {}),
					...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
					status: "active",
					updatedAt: now,
				})
				.where(eq(workspaces.id, workspaceId));
		}
	} else if (
		event.type === "customer.subscription.created" ||
		event.type === "customer.subscription.updated" ||
		event.type === "customer.subscription.deleted"
	) {
		const subscriptionId = typeof obj.id === "string" ? obj.id : null;
		const customerId = typeof obj.customer === "string" ? obj.customer : null;
		const workspaceId = typeof metadata.workspaceId === "string" ? metadata.workspaceId : null;
		const status = event.type === "customer.subscription.deleted"
			? "suspended"
			: mapStripeSubscriptionStatus(typeof obj.status === "string" ? obj.status : undefined);
		const items = (obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data;
		const priceId = items?.[0]?.price?.id ?? null;
		const plan = resolvePlanFromStripePriceOrMetadata(env, metadata.plan, priceId);
		const rawMailboxes = metadata.mailboxes ? Number(metadata.mailboxes) : null;
		const maxMailboxes = rawMailboxes && rawMailboxes >= 5 ? rawMailboxes : undefined;
		const billingCycle = typeof metadata.cycle === "string" ? metadata.cycle : undefined;
		const trialEndSec = typeof obj.trial_end === "number" ? obj.trial_end : null;
		const periodEndSec = typeof obj.current_period_end === "number" ? obj.current_period_end : null;

		const patch = {
			...(plan ? { plan } : {}),
			...(maxMailboxes ? { maxMailboxes } : {}),
			...(billingCycle ? { billingCycle } : {}),
			...(customerId ? { stripeCustomerId: customerId } : {}),
			...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
			...(priceId ? { stripePriceId: priceId } : {}),
			...(trialEndSec ? { trialEndsAt: new Date(trialEndSec * 1000) } : {}),
			...(periodEndSec ? { currentPeriodEnd: new Date(periodEndSec * 1000) } : {}),
			status,
			updatedAt: now,
		};

		if (workspaceId) {
			await db.update(workspaces).set(patch).where(eq(workspaces.id, workspaceId));
		} else if (subscriptionId) {
			await db.update(workspaces).set(patch).where(eq(workspaces.stripeSubscriptionId, subscriptionId));
		} else if (customerId) {
			await db.update(workspaces).set(patch).where(eq(workspaces.stripeCustomerId, customerId));
		}
	} else if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
		const customerId = typeof obj.customer === "string" ? obj.customer : null;
		const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;
		const status = event.type === "invoice.payment_failed" ? "suspended" : "active";
		if (subscriptionId) {
			await db
				.update(workspaces)
				.set({ status, updatedAt: now })
				.where(eq(workspaces.stripeSubscriptionId, subscriptionId));
		} else if (customerId) {
			await db
				.update(workspaces)
				.set({ status, updatedAt: now })
				.where(eq(workspaces.stripeCustomerId, customerId));
		}
	}

	return NextResponse.json({ received: true });
}

