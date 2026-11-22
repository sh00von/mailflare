import { resolveMx, resolveTxt } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { setupDomainSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { config } from "@/lib/config";

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
		const domainHostname = normalized;
		const serverMailHost = (config.email.mailHostname || `mail.${domainHostname}`).toLowerCase().replace(/\.$/, "");
		const [currentMx, rootTxt, dmarcTxt, dkimTxt] = await Promise.all([
			safeResolveMx(domainHostname),
			safeResolveTxt(domainHostname),
			safeResolveTxt(`_dmarc.${domainHostname}`),
			safeResolveTxt(`default._domainkey.${domainHostname}`),
		]);

		const mxAdded = currentMx.some((mx) => mx === serverMailHost);
		const spfAdded = rootTxt.some((txt) => txt.toLowerCase().startsWith("v=spf1") && (txt.toLowerCase().includes(serverMailHost) || txt.toLowerCase().includes("ip4:")));
		const dmarcAdded = dmarcTxt.some((txt) => txt.toLowerCase().startsWith("v=dmarc1"));
		const dkimAdded = dkimTxt.some((txt) => txt.toLowerCase().startsWith("v=dkim1"));

		const serverIp = config.email.serverIp;
		const spfValue = serverIp ? `v=spf1 ip4:${serverIp} ~all` : `v=spf1 a:${serverMailHost} ~all`;

		const requiredRecords = [
			{ type: "MX", name: "@", value: serverMailHost, priority: 10, added: mxAdded },
			{ type: "TXT", name: "@", value: spfValue, added: spfAdded },
			{ type: "TXT", name: "default._domainkey", value: "v=DKIM1; k=rsa; p=...", added: dkimAdded },
			{ type: "TXT", name: "_dmarc", value: "v=DMARC1; p=quarantine; pct=100; adkim=r; aspf=r", added: dmarcAdded },
		];

		return NextResponse.json({
			hasExistingMx: currentMx.length > 0 && !mxAdded,
			currentMx,
			requiredRecords,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "MX record check failed";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
