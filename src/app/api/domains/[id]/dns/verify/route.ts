import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { inspectDomainDnsHealth } from "@/lib/domains/dns-inspector";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	const user = auth.user;
	const db = getDb(env);

	const [domain] = await db
		.select()
		.from(domains)
		.where(eq(domains.id, id))
		.limit(1);

	if (!domain || (domain.userId !== user.id && !user.isPrimaryAdmin)) {
		return NextResponse.json({ error: "Domain not found" }, { status: 404 });
	}

	const report = await inspectDomainDnsHealth({
		hostname: domain.hostname,
		dkimSelector: domain.dkimSelector,
		dkimPublicKey: domain.dkimPublicKey,
	});

	// If MX, SPF, and DKIM are valid, activate domain status and sending
	if (report.checks.mx.valid && report.checks.spf.valid && report.checks.dkim.valid) {
		if (domain.status !== "active" || !domain.sendingEnabled || !domain.routingEnabled || domain.dnsSkipped) {
			await db
				.update(domains)
				.set({
					status: "active",
					sendingEnabled: true,
					routingEnabled: true,
					routingStatus: "active",
					dnsSkipped: false,
				})
				.where(eq(domains.id, id));
		}
	} else if (!report.checks.mx.valid && domain.status === "active") {
		// MX is missing/broken
		await db
			.update(domains)
			.set({ status: "error" })
			.where(eq(domains.id, id));
	}

	return NextResponse.json({ report });
}
