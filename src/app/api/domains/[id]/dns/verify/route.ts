import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { inspectDomainDnsHealth } from "@/lib/domains/dns-inspector";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
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

	// If MX, SPF, and DKIM are valid, activate domain status
	if (report.checks.mx.valid && report.checks.spf.valid && report.checks.dkim.valid) {
		if (domain.status !== "active") {
			await db
				.update(domains)
				.set({ status: "active" })
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
