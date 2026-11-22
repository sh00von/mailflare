import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { intakeIncomingMail } from "@/lib/email/intake";
import { verifyInboundSignature, verifyInboundSignatureV2 } from "@/lib/email/intake-signature";
import { inboundAttachmentLimitReasonFromRaw } from "@/lib/email/inbound-attachments";

export const dynamic = "force-dynamic";

/**
 * Inbound mail from the Cloudflare email relay Worker (deploy/cloudflare-email-relay).
 * The body is the raw RFC 5322 message; envelope addresses travel in headers and
 * the request is HMAC-signed with INBOUND_WEBHOOK_SECRET. The response tells the
 * relay whether to reject or forward, since only it can act on the live message.
 */
const MAX_INBOUND_BYTES = 25 * 1024 * 1024;

async function readBoundedArrayBuffer(request: Request, maxBytes: number): Promise<ArrayBuffer | null> {
	const contentLength = request.headers.get("content-length");
	if (contentLength) {
		const declared = Number.parseInt(contentLength, 10);
		if (Number.isFinite(declared) && declared > maxBytes) return null;
	}
	if (!request.body) return new ArrayBuffer(0);
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel().catch(() => undefined);
				return null;
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const combined = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return combined.buffer;
}

export async function POST(request: Request) {
	const env = getEnv();
	const secret = env.INBOUND_WEBHOOK_SECRET?.trim();
	if (!secret) return NextResponse.json({ error: "INBOUND_WEBHOOK_SECRET is not configured" }, { status: 503 });

	const from = request.headers.get("x-replyot-from") ?? "";
	const to = request.headers.get("x-replyot-to") ?? "";
	const signature = request.headers.get("x-replyot-signature") ?? "";
	const headerMap = request.headers.get("x-replyot-headers") ?? "{}";
	const timestamp = request.headers.get("x-replyot-timestamp");
	// Reject missing envelope/signature headers before buffering any request bytes into memory.
	if (!from || !to || !signature) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	const raw = await readBoundedArrayBuffer(request, MAX_INBOUND_BYTES);
	if (!raw) return NextResponse.json({ error: "Message exceeds the 25 MiB receiving limit" }, { status: 413 });
	// Relays that send a timestamp sign the header map too and cannot be replayed; older relays only
	// sign the body, which stays accepted unless INBOUND_REQUIRE_SIGNED_HEADERS is set.
	const valid = timestamp
		? await verifyInboundSignatureV2(secret, signature, raw, from, to, headerMap, timestamp)
		: env.INBOUND_REQUIRE_SIGNED_HEADERS !== "1" && await verifyInboundSignature(secret, signature, raw, from, to);
	if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	if (timestamp) {
		const seenKey = `relay-seen/${signature}`;
		if (await env.BUCKET.head(seenKey)) return NextResponse.json({ error: "Replayed request" }, { status: 409 });
		await env.BUCKET.put(seenKey, new Uint8Array(0));
	}
	const attachmentLimitReason = await inboundAttachmentLimitReasonFromRaw(raw);
	if (attachmentLimitReason) return NextResponse.json({ action: "reject", reason: attachmentLimitReason });

	let headers: Record<string, string> = {};
	try {
		headers = JSON.parse(headerMap) as Record<string, string>;
	} catch {
		// The header map is advisory; the raw message is authoritative.
	}

	let forwardTo: string | null = null;
	let forwardHeaders: Record<string, string> = {};
	const result = await intakeIncomingMail(
		env,
		{ from, to, raw, headers },
		{
			// The relay performs the forward on the live message; report it as done so keep-copy applies.
			forward: async (destination, extra) => {
				forwardTo = destination;
				forwardHeaders = extra;
				return true;
			},
		},
	);
	return NextResponse.json({ ...result, forwardTo, forwardHeaders });
}
