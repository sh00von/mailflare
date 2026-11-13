import { getPlanDefinition, resolvePlanId, type PlanId, type WorkspaceStatus } from "@/lib/plans/catalog";

const STRIPE_API = "https://api.stripe.com/v1";

export type StripeConfig = {
	secretKey: string;
	webhookSecret: string | null;
	prices: Partial<Record<PlanId, string>>;
};

function readEnvVar(env: CloudflareEnv, key: string): string | undefined {
	const fromEnv = (env as unknown as Record<string, unknown>)[key];
	if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
	const fromProcess = process.env[key];
	return fromProcess?.trim() || undefined;
}

export function getStripeConfig(env: CloudflareEnv): StripeConfig | null {
	const secretKey = readEnvVar(env, "STRIPE_SECRET_KEY");
	if (!secretKey) return null;
	return {
		secretKey,
		webhookSecret: readEnvVar(env, "STRIPE_WEBHOOK_SECRET") ?? null,
		prices: {
			starter: readEnvVar(env, "STRIPE_PRICE_STARTER"),
			pro: readEnvVar(env, "STRIPE_PRICE_PRO"),
			business: readEnvVar(env, "STRIPE_PRICE_BUSINESS"),
		},
	};
}

export function isStripeConfigured(env: CloudflareEnv): boolean {
	return !!getStripeConfig(env);
}

async function stripeFormRequest<T>(
	secretKey: string,
	path: string,
	params: Record<string, string>,
): Promise<T> {
	const body = new URLSearchParams(params);
	const response = await fetch(`${STRIPE_API}${path}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
	});
	const json = (await response.json().catch(() => null)) as { error?: { message?: string } } & T | null;
	if (!response.ok || !json) {
		throw new Error(json?.error?.message ?? `Stripe request failed (${response.status})`);
	}
	return json;
}

export async function createStripeCustomer(
	env: CloudflareEnv,
	input: { email: string; name: string; workspaceId: string },
): Promise<string> {
	const config = getStripeConfig(env);
	if (!config) throw new Error("Stripe is not configured");
	const customer = await stripeFormRequest<{ id: string }>(config.secretKey, "/customers", {
		email: input.email,
		name: input.name,
		"metadata[workspaceId]": input.workspaceId,
	});
	return customer.id;
}

export async function createStripeCheckoutSession(
	env: CloudflareEnv,
	input: {
		customerId: string;
		workspaceId: string;
		plan: PlanId;
		successUrl: string;
		cancelUrl: string;
	},
): Promise<{ id: string; url: string }> {
	const config = getStripeConfig(env);
	if (!config) throw new Error("Stripe is not configured");
	const planDef = getPlanDefinition(input.plan);
	const configuredPriceId = config.prices[input.plan];

	const params: Record<string, string> = {
		mode: "subscription",
		customer: input.customerId,
		success_url: input.successUrl,
		cancel_url: input.cancelUrl,
		allow_promotion_codes: "true",
		"metadata[workspaceId]": input.workspaceId,
		"metadata[plan]": input.plan,
		"subscription_data[metadata][workspaceId]": input.workspaceId,
		"subscription_data[metadata][plan]": input.plan,
		"line_items[0][quantity]": "1",
	};

	if (configuredPriceId) {
		params["line_items[0][price]"] = configuredPriceId;
	} else {
		params["line_items[0][price_data][currency]"] = "usd";
		params["line_items[0][price_data][unit_amount]"] = String(planDef.priceMonthlyUsd * 100);
		params["line_items[0][price_data][recurring][interval]"] = "month";
		params["line_items[0][price_data][product_data][name]"] = `Replyot ${planDef.name}`;
		params["line_items[0][price_data][product_data][description]"] =
			`${planDef.maxDomains} domains, ${planDef.maxMailboxes} mailboxes, ${planDef.storageLabel} storage`;
	}

	return stripeFormRequest<{ id: string; url: string }>(config.secretKey, "/checkout/sessions", params);
}

export async function createStripePortalSession(
	env: CloudflareEnv,
	input: { customerId: string; returnUrl: string },
): Promise<{ url: string }> {
	const config = getStripeConfig(env);
	if (!config) throw new Error("Stripe is not configured");
	return stripeFormRequest<{ url: string }>(config.secretKey, "/billing_portal/sessions", {
		customer: input.customerId,
		return_url: input.returnUrl,
	});
}

function constantTimeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

export async function verifyStripeWebhookSignature(
	payload: string,
	sigHeader: string | null,
	secret: string,
	toleranceSeconds = 300,
): Promise<boolean> {
	if (!sigHeader || !secret) return false;
	const parts = sigHeader.split(",").map((part) => part.trim());
	let timestamp: string | null = null;
	const signatures: string[] = [];
	for (const part of parts) {
		const [k, v] = part.split("=", 2);
		if (k === "t" && v) timestamp = v;
		else if (k === "v1" && v) signatures.push(v);
	}
	if (!timestamp || signatures.length === 0) return false;
	const tsNum = Number(timestamp);
	if (!Number.isFinite(tsNum) || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > toleranceSeconds) {
		return false;
	}

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
	const expected = Array.from(new Uint8Array(signed))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return signatures.some((sig) => constantTimeEqualHex(sig.toLowerCase(), expected));
}

export function mapStripeSubscriptionStatus(status: string | undefined): WorkspaceStatus {
	if (status === "active") return "active";
	if (status === "trialing") return "trialing";
	return "suspended";
}

export function resolvePlanFromStripePriceOrMetadata(
	env: CloudflareEnv,
	metadataPlan: unknown,
	priceId: string | null | undefined,
): PlanId | null {
	if (metadataPlan === "starter" || metadataPlan === "pro" || metadataPlan === "business") {
		return metadataPlan;
	}
	if (!priceId) return null;
	const config = getStripeConfig(env);
	if (!config) return null;
	for (const [planId, configuredPrice] of Object.entries(config.prices) as [PlanId, string | undefined][]) {
		if (configuredPrice && configuredPrice === priceId) return resolvePlanId(planId);
	}
	return null;
}

export async function retrieveStripeCheckoutSession(
	env: CloudflareEnv,
	sessionId: string,
): Promise<{
	id: string;
	customer: string | null;
	subscription: string | null;
	metadata: Record<string, string>;
	payment_status: string;
	status: string;
}> {
	const config = getStripeConfig(env);
	if (!config) throw new Error("Stripe is not configured");
	const response = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
		headers: { Authorization: `Bearer ${config.secretKey}` },
	});
	if (!response.ok) throw new Error(`Failed to retrieve checkout session (${response.status})`);
	return response.json();
}

export type StripeInvoice = {
	id: string;
	number: string | null;
	created: number;
	amount_paid: number;
	currency: string;
	status: string;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
	period_start: number;
	period_end: number;
};

export async function listStripeInvoices(
	env: CloudflareEnv,
	customerId: string,
	limit = 10,
): Promise<StripeInvoice[]> {
	const config = getStripeConfig(env);
	if (!config) return [];
	const response = await fetch(`${STRIPE_API}/invoices?customer=${encodeURIComponent(customerId)}&limit=${limit}`, {
		headers: { Authorization: `Bearer ${config.secretKey}` },
	});
	if (!response.ok) return [];
	const data = (await response.json()) as { data?: StripeInvoice[] };
	return data.data ?? [];
}


