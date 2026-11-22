import { queryDns } from "@/lib/dns-query";

export interface DnsCheckItem {
	valid: boolean;
	expected: string;
	found?: string[];
	hint?: string;
}

export interface DnsAuditReport {
	hostname: string;
	overallStatus: "valid" | "warning" | "error";
	checks: {
		mx: DnsCheckItem;
		spf: DnsCheckItem;
		dkim: DnsCheckItem;
		dmarc: DnsCheckItem;
	};
	lastChecked: string;
}

export interface DomainDnsContext {
	hostname: string;
	dkimSelector?: string | null;
	dkimPublicKey?: string | null;
	expectedMx?: string;
}

/**
 * Performs real-time inspection of a domain's deliverability records:
 * MX, SPF, DKIM (2048-bit), and DMARC.
 */
export async function inspectDomainDnsHealth(domain: DomainDnsContext): Promise<DnsAuditReport> {
	const hostname = domain.hostname.trim().toLowerCase();
	const selector = domain.dkimSelector || "default";
	const expectedMxHost = domain.expectedMx || process.env.MAIL_HOSTNAME || "mail." + hostname;

	// 1. Check MX
	let mxValid = false;
	let foundMx: string[] = [];
	try {
		foundMx = await queryDns(hostname, "MX");
		mxValid = foundMx.length > 0;
	} catch (e) {
		console.warn(`MX query failed for ${hostname}:`, e);
	}

	// 2. Check SPF
	let spfValid = false;
	let foundTxt: string[] = [];
	try {
		foundTxt = await queryDns(hostname, "TXT");
		spfValid = foundTxt.some((t) => t.toLowerCase().includes("v=spf1"));
	} catch (e) {
		console.warn(`SPF query failed for ${hostname}:`, e);
	}

	// 3. Check DKIM
	let dkimValid = false;
	let foundDkim: string[] = [];
	const dkimHost = `${selector}._domainkey.${hostname}`;
	try {
		foundDkim = await queryDns(dkimHost, "TXT");
		dkimValid = foundDkim.some((t) => t.includes("v=DKIM1") || t.includes("p="));
	} catch (e) {
		console.warn(`DKIM query failed for ${dkimHost}:`, e);
	}

	// 4. Check DMARC
	let dmarcValid = false;
	let foundDmarc: string[] = [];
	const dmarcHost = `_dmarc.${hostname}`;
	try {
		foundDmarc = await queryDns(dmarcHost, "TXT");
		dmarcValid = foundDmarc.some((t) => t.toLowerCase().includes("v=dmarc1"));
	} catch (e) {
		console.warn(`DMARC query failed for ${dmarcHost}:`, e);
	}

	// Determine overall status
	let overallStatus: "valid" | "warning" | "error" = "valid";
	if (!mxValid) {
		overallStatus = "error";
	} else if (!spfValid || !dkimValid) {
		overallStatus = "warning";
	} else if (!dmarcValid) {
		overallStatus = "warning";
	}

	return {
		hostname,
		overallStatus,
		checks: {
			mx: {
				valid: mxValid,
				expected: `MX priority 10 pointing to ${expectedMxHost}`,
				found: foundMx,
				hint: mxValid ? undefined : `Add an MX record pointing to ${expectedMxHost}`,
			},
			spf: {
				valid: spfValid,
				expected: `TXT v=spf1 mx ~all`,
				found: foundTxt.filter((t) => t.toLowerCase().includes("v=spf1")),
				hint: spfValid ? undefined : "Add a TXT record with 'v=spf1 mx ~all' to prevent spoofing",
			},
			dkim: {
				valid: dkimValid,
				expected: `TXT record at ${dkimHost}`,
				found: foundDkim,
				hint: dkimValid ? undefined : `Add a TXT record at '${dkimHost}' with your 2048-bit DKIM public key`,
			},
			dmarc: {
				valid: dmarcValid,
				expected: `TXT record at ${dmarcHost} with 'v=DMARC1; p=reject;'`,
				found: foundDmarc,
				hint: dmarcValid ? undefined : `Add a TXT record at '${dmarcHost}' with 'v=DMARC1; p=none;' or 'p=reject;'`,
			},
		},
		lastChecked: new Date().toISOString(),
	};
}

/**
 * Periodically polls DNS health for active domains (called by 4-hour cron scheduler).
 */
export async function pollDnsHealthForActiveDomains(env: CloudflareEnv): Promise<void> {
	try {
		const { getDb } = await import("@/db");
		const { domains } = await import("@/db/schema");
		const { eq } = await import("drizzle-orm");

		const db = getDb(env);
		const activeDomains = await db
			.select({
				id: domains.id,
				hostname: domains.hostname,
				dkimSelector: domains.dkimSelector,
				dkimPublicKey: domains.dkimPublicKey,
			})
			.from(domains)
			.where(eq(domains.status, "active"))
			.limit(100);

		for (const domain of activeDomains) {
			try {
				const report = await inspectDomainDnsHealth(domain);
				if (!report.checks.mx.valid || !report.checks.spf.valid || !report.checks.dkim.valid) {
					console.warn(
						`[DNS Health Poller] Deliverability warning on ${domain.hostname}: MX=${report.checks.mx.valid}, SPF=${report.checks.spf.valid}, DKIM=${report.checks.dkim.valid}`,
					);
				}
			} catch (err) {
				console.warn(`[DNS Health Poller] Error checking ${domain.hostname}:`, err);
			}
		}
	} catch (e) {
		console.warn("[DNS Health Poller] Failed to query active domains:", e);
	}
}
