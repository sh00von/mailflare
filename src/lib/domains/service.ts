import { eq, and, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes } from "@/db/schema";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { newId } from "@/lib/ids";
import {
	disableEmailRouting,
	getEmailRoutingDns,
	getEmailRoutingSettings,
	getSendingSubdomainDns,
	deleteSendingSubdomain,
	listSendingSubdomains,
	type CfDnsRecord,
} from "@/lib/cloudflare-api";
import { deleteEmailRoutingRulesForDomain } from "@/lib/domains/cloudflare-cleanup";
import { isManualZone, provisionDomainOnCloudflare } from "@/lib/domains/provision";
import { getManualDomainDns } from "@/lib/domains/manual-dns";
import { rollbackDomainProvisioning } from "@/lib/domains/rollback";
import type { DomainProvisioningChanges } from "@/lib/domains/types";
import { findSendingSubdomain } from "@/lib/domains/sending-status";
import { ensureOutboundSendingDomain } from "@/lib/email/resend-domain-setup";
import { preflightDomain } from "@/lib/domains/preflight";
import { hasCloudflareCredentials } from "@/lib/runtime";
import { checkDomainOwnershipDns, DomainOwnershipError } from "@/lib/domains/ownership";

export type DomainDnsView = {
	routing: { records: CfDnsRecord[]; missing: CfDnsRecord[]; status?: string };
	sending: CfDnsRecord[];
	sendingEnabled: boolean;
	/** DKIM selector Cloudflare signs with, when a sending subdomain exists. */
	dkimSelector?: string;
	/** The matching sending subdomain, when the zone has the domain added for sending. */
	sendingSubdomain?: { name: string; tag: string };
};

import { generateDkimKeyPair } from "@/lib/email/dkim";

export async function listUserDomains(env: CloudflareEnv, userId: string) {
	const db = getDb(env);
	return db.select().from(domains).where(eq(domains.userId, userId));
}

export async function addDomainForUser(
	env: CloudflareEnv,
	userId: string,
	hostname: string,
	options?: { enableRouting?: boolean; enableSending?: boolean; replaceMxRecords?: boolean; skipDns?: boolean; receivingProvider?: "none" | "cloudflare" | "resend" | "ses" | "postfix"; sendingProvider?: "none" | "cloudflare" | "resend" | "ses" | "postfix" },
): Promise<{
	domain: typeof domains.$inferSelect;
	dns: DomainDnsView;
	changes: DomainProvisioningChanges;
}> {
	const db = getDb(env);
	const normalizedHostname = hostname.toLowerCase().trim();
	const [claimedHostname] = await db.select({ userId: domains.userId }).from(domains).where(eq(domains.hostname, normalizedHostname)).limit(1);
	if (claimedHostname && claimedHostname.userId !== userId) {
		throw new Error("Domain is already registered");
	}

	const skipDns = options?.skipDns === true;
	const defaultSendingProvider = "postfix";
	const receivingProvider = skipDns ? "none" : (options?.receivingProvider ?? "postfix");
	const requestedSending = skipDns ? "none" : (options?.sendingProvider ?? (options?.enableSending === false ? "none" : defaultSendingProvider));

	let insertedDomainId: string | null = null;
	let domain: typeof domains.$inferSelect;

	try {
		const [existing] = await db.select().from(domains).where(eq(domains.hostname, normalizedHostname)).limit(1);
		if (existing && existing.userId !== userId) {
			throw new Error("Domain is already registered");
		}

		const domainId = existing?.id ?? newId("dom");
		const dkim = (!existing || !existing.dkimPrivateKey) ? generateDkimKeyPair() : null;
		const values = {
			id: domainId,
			userId,
			hostname: normalizedHostname,
			zoneId: "self-hosted",
			status: "active" as const,
			receivingProvider,
			routingStatus: "active",
			sendingSubdomainTag: null,
			sendingRequested: true,
			sendingProvider: requestedSending !== "none" ? requestedSending : ("postfix" as const),
			sendingEnabled: true,
			routingEnabled: true,
			dnsSkipped: false,
			...(dkim ? { dkimPrivateKey: dkim.privateKey, dkimPublicKey: dkim.publicKey, dkimSelector: dkim.selector } : {}),
		};

		if (existing) {
			await db.update(domains).set(values).where(eq(domains.id, domainId));
		} else {
			await db.insert(domains).values(values);
			insertedDomainId = domainId;
		}

		const aliasMailboxes = await db
			.select({ id: mailboxes.id, domainId: mailboxes.domainId, localPart: mailboxes.localPart, useAllDomains: mailboxes.useAllDomains })
			.from(mailboxes)
			.innerJoin(domains, eq(mailboxes.domainId, domains.id))
			.where(and(eq(domains.userId, userId), eq(mailboxes.useAllDomains, true)));
		const routingResults = await Promise.allSettled(
			aliasMailboxes.map((mailbox) => ensureMailboxDomainRouting(env, db, mailbox)),
		);
		for (const result of routingResults) {
			if (result.status === "rejected") console.warn("ensureMailboxDomainRouting", result.reason);
		}

		const [row] = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);
		domain = row!;

		return {
			domain,
			dns: {
				routing: { records: [], missing: [], status: "active" },
				sending: [],
				sendingEnabled: true,
			},
			changes: {
				zoneId: domain.zoneId || "",
				enabledEmailRouting: false,
				createdSendingSubdomainTag: null,
				previousCatchAll: null,
				createdAddressRules: [],
				deletedMxRecords: [],
			},
		};
	} catch (err) {
		if (insertedDomainId) {
			try {
				await db.delete(domains).where(eq(domains.id, insertedDomainId));
			} catch (cleanupErr) {
				console.warn("Failed to clean up domain row after failure:", cleanupErr);
			}
		}
		throw err;
	}
}

export async function getDomainDns(
	env: CloudflareEnv,
	domain: typeof domains.$inferSelect,
): Promise<DomainDnsView> {
	if (domain.zoneId === "self-hosted" || domain.zoneId === "manual" || isManualZone(domain.zoneId)) {
		return {
			routing: { records: [], missing: [], status: "active" },
			sending: [],
			sendingEnabled: true,
			dkimSelector: domain.dkimSelector ?? undefined,
		};
	}
	// Read the zone's actual sending state rather than trusting `sendingRequested`,
	// which goes stale when sending is enabled outside Replyot (or when the row
	// was written before the subdomain existed). A missing Email Sending permission
	// must not take down the routing/DNS view, so a failed list degrades to none.
	const [routingDns, routingSettings, sendingSubdomains] = await Promise.all([
		getEmailRoutingDns(env, domain.zoneId),
		getEmailRoutingSettings(env, domain.zoneId),
		listSendingSubdomains(env, domain.zoneId).catch((error) => {
			console.warn("getDomainDns: failed to list sending subdomains", error);
			return [];
		}),
	]);
	const sendingSubdomain = findSendingSubdomain(domain.hostname, sendingSubdomains);
	let sending: CfDnsRecord[] = [];
	if (sendingSubdomain?.tag) {
		sending = await getSendingSubdomainDns(env, domain.zoneId, sendingSubdomain.tag).catch(
			(error) => {
				console.warn("getDomainDns: failed to read sending subdomain DNS", error);
				return [];
			},
		);
	}
	return {
		routing: {
			records: routingDns.records,
			missing: routingDns.missing,
			status: routingSettings.status,
		},
		sending,
		sendingEnabled: sendingSubdomain?.enabled ?? false,
		dkimSelector: sendingSubdomain?.dkim_selector,
		sendingSubdomain: sendingSubdomain
			? { name: sendingSubdomain.name, tag: sendingSubdomain.tag }
			: undefined,
	};
}

export async function removeDomainForUser(
	env: CloudflareEnv,
	userId: string,
	domainId: string,
): Promise<void> {
	const db = getDb(env);
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
		.limit(1);
	if (!domain) throw new Error("Domain not found");

	if (domain.zoneId !== "manual" && domain.zoneId !== "self-hosted") {
		try {
			await deleteEmailRoutingRulesForDomain(env, domain.zoneId, domain.hostname);
		} catch (err) {
			console.warn("deleteEmailRoutingRulesForDomain", err);
		}

		const [otherDomainOnZone] = await db.select({ id: domains.id }).from(domains).where(and(
			eq(domains.zoneId, domain.zoneId),
			ne(domains.id, domainId),
		)).limit(1);
		if (domain.routingEnabled && !otherDomainOnZone) {
			try {
				await disableEmailRouting(env, domain.zoneId);
			} catch (err) {
				console.warn("disableEmailRouting", err);
			}
		}

		if (domain.sendingSubdomainTag) {
			try {
				await deleteSendingSubdomain(env, domain.zoneId, domain.sendingSubdomainTag);
			} catch (err) {
				console.warn("deleteSendingSubdomain", err);
			}
		}
	}

	await db.delete(domains).where(eq(domains.id, domainId));
}

export async function getDomainForUser(env: CloudflareEnv, userId: string, domainId: string) {
	const db = getDb(env);
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
		.limit(1);
	return domain ?? null;
}
