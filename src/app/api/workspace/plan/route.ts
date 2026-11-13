import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import {
	isStripeConfigured,
	retrieveStripeCheckoutSession,
	listStripeInvoices,
	type StripeInvoice,
} from "@/lib/billing/stripe";
import { PLAN_LIST, resolvePlanId } from "@/lib/plans/catalog";
import { getWorkspaceWithUsage } from "@/lib/plans/usage";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (user.role !== "admin" && !user.isPrimaryAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const url = new URL(request.url);
	const sessionId = url.searchParams.get("session_id");
	const db = getDb(env);

	const { workspace: initialWs } = await getWorkspaceWithUsage(env, user);

	if (sessionId && isStripeConfigured(env)) {
		try {
			const session = await retrieveStripeCheckoutSession(env, sessionId);
			if (session.payment_status === "paid" || session.status === "complete") {
				const plan = resolvePlanId(session.metadata?.plan);
				const customerId = session.customer;
				const subscriptionId = session.subscription;
				await db
					.update(workspaces)
					.set({
						plan,
						status: "active",
						...(customerId ? { stripeCustomerId: customerId } : {}),
						...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
						updatedAt: new Date(),
					})
					.where(eq(workspaces.id, initialWs.id));
			}
		} catch (err) {
			console.error("Failed to sync checkout session:", err);
		}
	}

	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const [wsRow] = await db
		.select({
			stripeCustomerId: workspaces.stripeCustomerId,
			stripeSubscriptionId: workspaces.stripeSubscriptionId,
			currentPeriodEnd: workspaces.currentPeriodEnd,
		})
		.from(workspaces)
		.where(eq(workspaces.id, workspace.id))
		.limit(1);

	let invoices: StripeInvoice[] = [];
	if (wsRow?.stripeCustomerId && isStripeConfigured(env)) {
		try {
			invoices = await listStripeInvoices(env, wsRow.stripeCustomerId);
		} catch (err) {
			console.error("Failed to list Stripe invoices:", err);
		}
	}

	return NextResponse.json({
		workspace,
		usage,
		plans: PLAN_LIST,
		billing: {
			stripeConfigured: isStripeConfigured(env),
			hasCustomer: !!wsRow?.stripeCustomerId,
			currentPeriodEnd: wsRow?.currentPeriodEnd ? wsRow.currentPeriodEnd.toISOString() : null,
		},
		invoices,
	});
}

