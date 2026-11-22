import { summariseDns, type DnsStatusSummary } from "@/lib/dns-status";
import { auditDomainDns, type DomainDnsAudit } from "@/lib/domains/dns-audit";
import { getDomainDns, type DomainDnsView } from "@/lib/domains/service";
import type { DomainRow } from "@/lib/domains/types";
import { generateDkimKeyPair } from "@/lib/email/dkim";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { eq } from "drizzle-orm";

export type DomainDnsViewWithAudit = DomainDnsView & { audit: DomainDnsAudit };

/** Ensures a domain always has a 2048-bit RSA DKIM keypair generated and persisted. */
async function ensureDkimKeyPair(env: CloudflareEnv, domain: DomainRow): Promise<void> {
	if (domain.dkimPrivateKey && domain.dkimPublicKey) return;
	const keypair = generateDkimKeyPair(domain.dkimSelector || "default");
	await getDb(env)
		.update(domains)
		.set({
			dkimPrivateKey: keypair.privateKey,
			dkimPublicKey: keypair.publicKey,
			dkimSelector: keypair.selector,
		})
		.where(eq(domains.id, domain.id));
	domain.dkimPrivateKey = keypair.privateKey;
	domain.dkimPublicKey = keypair.publicKey;
	domain.dkimSelector = keypair.selector;
}

/** The DNS page's view: zone records plus an independent public-DNS audit. */
export async function getDomainDnsView(
	env: CloudflareEnv,
	domain: DomainRow,
): Promise<DomainDnsViewWithAudit> {
	await ensureDkimKeyPair(env, domain);
	const dns = await getDomainDns(env, domain);
	const audit = await auditDomainDns(domain.hostname, dns, domain.sendingProvider);
	return { ...dns, audit };
}

/** The compact per-domain status the list endpoint returns. */
export async function summariseDomainDns(
	env: CloudflareEnv,
	domain: DomainRow,
): Promise<{ summary: DnsStatusSummary; sendingEnabled: boolean }> {
	await ensureDkimKeyPair(env, domain);
	const view = await getDomainDns(env, domain);
	const audit = await auditDomainDns(domain.hostname, view, domain.sendingProvider);
	return {
		summary: summariseDns(
			view.routing.records,
			view.routing.missing,
			view.sending,
			domain.routingEnabled,
			view.sendingEnabled,
			audit,
		),
		sendingEnabled: view.sendingEnabled,
	};
}
