import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { PLAN_LIST } from "@/lib/plans/catalog";
import { getWorkspaceWithUsage } from "@/lib/plans/usage";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (user.role !== "admin" && !user.isPrimaryAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const [wsRow] = await getDb(env)
		.select({ stripeCustomerId: workspaces.stripeCustomerId, currentPeriodEnd: workspaces.currentPeriodEnd })
		.from(workspaces)
		.where(eq(workspaces.id, workspace.id))
		.limit(1);

	return NextResponse.json({
		workspace,
		usage,
		plans: PLAN_LIST,
		billing: {
			stripeConfigured: isStripeConfigured(env),
			hasCustomer: !!wsRow?.stripeCustomerId,
			currentPeriodEnd: wsRow?.currentPeriodEnd ? wsRow.currentPeriodEnd.toISOString() : null,
		},
	});
}

