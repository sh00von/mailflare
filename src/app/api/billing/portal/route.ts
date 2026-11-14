import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { createStripePortalSession, isStripeConfigured } from "@/lib/billing/stripe";
import { getEnv } from "@/lib/cloudflare";
import { getOrEnsureWorkspaceForUser } from "@/lib/plans/usage";

function resolveAdminBaseUrl(request: Request): string {
	const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
	if (configured) return configured;
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (user.role !== "admin" && !user.isPrimaryAdmin) {
		return NextResponse.json({ error: "Only workspace admins can manage billing" }, { status: 403 });
	}
	if (!isStripeConfigured(env)) {
		return NextResponse.json({ error: "Stripe billing is not configured yet" }, { status: 503 });
	}

	const workspace = await getOrEnsureWorkspaceForUser(env, user);
	const [wsRow] = await getDb(env)
		.select({ stripeCustomerId: workspaces.stripeCustomerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspace.id))
		.limit(1);

	if (!wsRow?.stripeCustomerId) {
		return NextResponse.json({ error: "No Stripe billing profile found for this workspace yet" }, { status: 400 });
	}

	const baseUrl = resolveAdminBaseUrl(request);
	const session = await createStripePortalSession(env, {
		customerId: wsRow.stripeCustomerId,
		returnUrl: `${baseUrl}/admin/plan`,
	});

	return NextResponse.json({ url: session.url });
}

