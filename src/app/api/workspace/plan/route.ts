import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import {
	isStripeConfigured,
	retrieveStripeCheckoutSession,
	retrieveStripeSubscription,
	listActiveStripeSubscriptions,
	listStripeInvoices,
	type StripeInvoice,
	type StripeSubscriptionInfo,
} from "@/lib/billing/stripe";
import { PLAN_LIST, getPlanDefinition, resolvePlanId } from "@/lib/plans/catalog";
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
				const addonId = session.metadata?.addonId;
				const customerId = session.customer;
				const subscriptionId = session.subscription;

				if (addonId === "addon_mailboxes") {
					await db
						.update(workspaces)
						.set({
							maxMailboxes: sql`${workspaces.maxMailboxes} + 5`,
							status: "active",
							...(customerId ? { stripeCustomerId: customerId } : {}),
							updatedAt: new Date(),
						})
						.where(eq(workspaces.id, initialWs.id));
				} else if (addonId === "addon_storage") {
					await db
						.update(workspaces)
						.set({
							stripePriceId: sql`coalesce(${workspaces.stripePriceId}, '') || ',addon_storage_20gb'`,
							status: "active",
							...(customerId ? { stripeCustomerId: customerId } : {}),
							updatedAt: new Date(),
						})
						.where(eq(workspaces.id, initialWs.id));
				} else {
					const rawPlan = resolvePlanId(session.metadata?.plan);
					const plan = (rawPlan === "free" ? "starter" : rawPlan) as "starter" | "pro" | "business";
					const billingCycle = session.metadata?.cycle === "yearly" ? "yearly" : "monthly";
					const planDef = getPlanDefinition(plan);
					await db
						.update(workspaces)
						.set({
							plan,
							status: "active",
							maxMailboxes: planDef.maxMailboxes,
							billingCycle,
							...(customerId ? { stripeCustomerId: customerId } : {}),
							...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
							updatedAt: new Date(),
						})
						.where(eq(workspaces.id, initialWs.id));
				}
			}
		} catch (err) {
			console.error("Failed to sync checkout session:", err);
		}
	}

	// Always sync with Stripe active subscription to ensure mailboxes, cycle, and currentPeriodEnd match reality
	const [wsRowCurrent] = await db
		.select({
			plan: workspaces.plan,
			stripeCustomerId: workspaces.stripeCustomerId,
			stripeSubscriptionId: workspaces.stripeSubscriptionId,
			currentPeriodEnd: workspaces.currentPeriodEnd,
			maxMailboxes: workspaces.maxMailboxes,
			billingCycle: workspaces.billingCycle,
		})
		.from(workspaces)
		.where(eq(workspaces.id, initialWs.id))
		.limit(1);

	if (isStripeConfigured(env) && (wsRowCurrent?.stripeSubscriptionId || wsRowCurrent?.stripeCustomerId)) {
		try {
			let activeSub: StripeSubscriptionInfo | null = null;
			if (wsRowCurrent.stripeSubscriptionId) {
				activeSub = await retrieveStripeSubscription(env, wsRowCurrent.stripeSubscriptionId);
			}
			if (!activeSub && wsRowCurrent.stripeCustomerId) {
				const subs = await listActiveStripeSubscriptions(env, wsRowCurrent.stripeCustomerId);
				activeSub = subs[0] ?? null;
			}

			if (activeSub) {
				const rawSubPlan = resolvePlanId(activeSub.metadata?.plan);
				const subPlan = (rawSubPlan === "free" ? "starter" : rawSubPlan) as "starter" | "pro" | "business";
				const subCycle = activeSub.metadata?.cycle === "yearly" ? "yearly" : "monthly";
				const planDef = getPlanDefinition(subPlan);
				const periodEnd = activeSub.current_period_end ? new Date(activeSub.current_period_end * 1000) : null;

				const patch: Record<string, unknown> = {
					status: "active",
					plan: subPlan,
					maxMailboxes: planDef.maxMailboxes,
					billingCycle: subCycle,
					updatedAt: new Date(),
				};
				let shouldUpdate = false;

				if (subPlan !== wsRowCurrent.plan) shouldUpdate = true;
				if (planDef.maxMailboxes !== wsRowCurrent.maxMailboxes) shouldUpdate = true;
				if (subCycle !== wsRowCurrent.billingCycle) shouldUpdate = true;
				if (activeSub.id && activeSub.id !== wsRowCurrent.stripeSubscriptionId) {
					patch.stripeSubscriptionId = activeSub.id;
					shouldUpdate = true;
				}
				if (periodEnd && (!wsRowCurrent.currentPeriodEnd || Math.abs(wsRowCurrent.currentPeriodEnd.getTime() - periodEnd.getTime()) > 60000)) {
					patch.currentPeriodEnd = periodEnd;
					shouldUpdate = true;
				}

				if (shouldUpdate) {
					await db.update(workspaces).set(patch).where(eq(workspaces.id, initialWs.id));
				}
			}
		} catch (err) {
			console.error("Failed to sync active Stripe subscription:", err);
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

