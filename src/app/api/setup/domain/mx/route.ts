import { resolveMx, resolveTxt } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { preflightDomain } from "@/lib/domains/preflight";
import { ensureOutboundSendingDomain } from "@/lib/email/resend-domain-setup";
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
	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json({ error: "Too many DNS checks. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
	}

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
	const normalized = parsed.data.hostname.toLowerCase().trim();
	const [existing] = await getDb(env).select({ id: domains.id }).from(domains).where(eq(domains.hostname, normalized)).limit(1);
	if (existing) {
		return NextResponse.json({ error: "This domain is already registered. Only the workspace owner can create team accounts for it." }, { status: 409 });
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

		// Only create the domain in Resend/SES after the caller proves ownership via MX, SPF, and DMARC.
		const ownershipVerified = mxAdded && spfAdded && dmarcAdded;
		const outboundSetup = await ensureOutboundSendingDomain(env, domain.hostname, {
			createIfMissing: ownershipVerified,
		}).catch((err) => {
			console.error("[setup/domain/mx] Outbound domain setup failed:", err);
			return null;
		});
		const requiredRecords = [
			{ type: "MX", name: "@", value: expectedMx, priority: 10, added: mxAdded },
			{ type: "TXT", name: "@", value: `v=spf1 a:${expectedMx} ~all`, added: spfAdded },
			{ type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none", added: dmarcAdded },
			...(outboundSetup?.records ?? []),
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
