import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import {
	createStripeCheckoutSession,
	createStripeCustomer,
	isStripeConfigured,
} from "@/lib/billing/stripe";
import { getEnv } from "@/lib/cloudflare";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { getOrEnsureWorkspaceForUser } from "@/lib/plans/usage";

const checkoutSchema = z.object({
	plan: z.enum(["starter", "pro", "business"]),
	cycle: z.enum(["monthly", "yearly", "6m", "12m"]).optional(),
});

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

	let body: unknown;
	try {
		body = await readJsonBody(request, 8 * 1024);
	} catch (error) {
		return NextResponse.json(
			{ error: "Invalid request" },
			{ status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
		);
	}
	const parsed = checkoutSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Choose a valid plan" }, { status: 400 });
	}

	const workspace = await getOrEnsureWorkspaceForUser(env, user);
	const db = getDb(env);
	const [wsRow] = await db
		.select({ stripeCustomerId: workspaces.stripeCustomerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspace.id))
		.limit(1);

	let customerId = wsRow?.stripeCustomerId ?? null;
	if (!customerId) {
		customerId = await createStripeCustomer(env, {
			email: user.email,
			name: workspace.name,
			workspaceId: workspace.id,
		});
		await db
			.update(workspaces)
			.set({ stripeCustomerId: customerId, updatedAt: new Date() })
			.where(eq(workspaces.id, workspace.id));
	}

	const baseUrl = resolveAdminBaseUrl(request);
	const session = await createStripeCheckoutSession(env, {
		customerId,
		workspaceId: workspace.id,
		plan: parsed.data.plan,
		cycle: parsed.data.cycle === "yearly" || parsed.data.cycle === "12m" ? "yearly" : "monthly",
		successUrl: `${baseUrl}/admin/plan?billing=success&session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${baseUrl}/admin/plan?billing=canceled`,
	});

	return NextResponse.json({ url: session.url });
}

