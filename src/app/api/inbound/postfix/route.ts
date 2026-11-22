import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { intakeIncomingMail } from "@/lib/email/intake";
import { inboundAttachmentLimitReasonFromRaw } from "@/lib/email/inbound-attachments";

export const dynamic = "force-dynamic";

function safeSecretCompare(a?: string | null, b?: string | null): boolean {
	if (!a || !b) return false;
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

/**
 * Inbound endpoint for Postfix container mail delivery.
 * Postfix pipes incoming RFC 822 messages here via internal webhook.
 */
export async function POST(request: Request) {
	const env = getEnv();
	const secret = (process.env.INBOUND_WEBHOOK_SECRET ?? env.INBOUND_WEBHOOK_SECRET)?.trim();

	if (!secret) {
		return NextResponse.json({ error: "INBOUND_WEBHOOK_SECRET is not configured" }, { status: 503 });
	}

	const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
	const tokenHeader = request.headers.get("x-webhook-token")?.trim();
	const urlToken = new URL(request.url).searchParams.get("token")?.trim();
	const provided = authHeader || tokenHeader || urlToken;
	if (!safeSecretCompare(provided, secret)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const raw = await request.arrayBuffer();
	if (raw.byteLength === 0) {
		return NextResponse.json({ error: "Empty message payload" }, { status: 400 });
	}

	if (raw.byteLength > 35 * 1024 * 1024) {
		return NextResponse.json({ error: "Message exceeds receiving limit (35 MB)" }, { status: 413 });
	}

	const url = new URL(request.url);
	const from = request.headers.get("x-envelope-from") ??
		request.headers.get("x-postfix-from") ??
		url.searchParams.get("from") ??
		"";

	const to = request.headers.get("x-envelope-to") ??
		request.headers.get("x-postfix-to") ??
		url.searchParams.get("to") ??
		"";

	if (!to) {
		return NextResponse.json({ error: "Missing recipient address" }, { status: 400 });
	}

	const attachmentLimitReason = await inboundAttachmentLimitReasonFromRaw(raw);
	if (attachmentLimitReason) {
		return NextResponse.json({ action: "reject", reason: attachmentLimitReason });
	}

	const headers: Record<string, string> = {};

	const result = await intakeIncomingMail(
		env,
		{ from, to, raw, headers },
		{
			reject: async (reason) => {
				console.warn(`[postfix-inbound] Rejected mail for ${to}: ${reason}`);
			},
			forward: async (destination) => {
				console.log(`[postfix-inbound] Forwarding mail for ${to} to ${destination}`);
				return true;
			},
		},
	);

	return NextResponse.json(result);
}
