import { resolveMx, resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { preflightDomain } from "@/lib/domains/preflight";
import { ensureResendSendingDomain } from "@/lib/email/resend-domain-setup";
import { setupDomainSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";

async function safeResolveMx(hostname: string): Promise<string[]> {
	try {
		const records = await resolveMx(hostname);
		return records.map((r) => r.exchange.trim().toLowerCase().replace(/\.$/, ""));
	} catch {
		return [];
	}
}

async function safeResolveTxt(hostname: string): Promise<string[]> {
	try {
		const records = await resolveTxt(hostname);
		return records.map((chunks) => chunks.join("").trim());
	} catch {
		return [];
	}
}

export async function POST(request: Request) {
	const env = getEnv();

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid MX check request" }, { status });
	}

	const parsed = setupDomainSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	try {
		const domain = await preflightDomain(env, parsed.data.hostname);
		const expectedMx = (process.env.MAIL_HOSTNAME?.trim() || `mail.${domain.hostname}`).toLowerCase().replace(/\.$/, "");
		const [currentMx, rootTxt, dmarcTxt] = await Promise.all([
			safeResolveMx(domain.hostname),
			safeResolveTxt(domain.hostname),
			safeResolveTxt(`_dmarc.${domain.hostname}`),
		]);

		const mxAdded = currentMx.some((mx) => mx === expectedMx);
		const spfAdded = rootTxt.some((txt) => txt.toLowerCase().startsWith("v=spf1") && txt.toLowerCase().includes(expectedMx));
		const dmarcAdded = dmarcTxt.some((txt) => txt.toLowerCase().startsWith("v=dmarc1"));

		const resendSetup = await ensureResendSendingDomain(env, domain.hostname).catch((err) => {
			console.error("[setup/domain/mx] Resend domain setup failed:", err);
			return null;
		});
		const requiredRecords = [
			{ type: "MX", name: "@", value: expectedMx, priority: 10, added: mxAdded },
			{ type: "TXT", name: "@", value: `v=spf1 a:${expectedMx} ~all`, added: spfAdded },
			{ type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none", added: dmarcAdded },
			...(resendSetup?.records ?? []),
		];

		return NextResponse.json({
			hasExistingMx: false,
			currentMx,
			requiredRecords,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "MX record check failed";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
