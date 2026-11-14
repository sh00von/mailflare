import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import type { DomainRow } from "@/lib/domains/types";

export type ReceivingProviderId = "postfix" | "none";
export type ConfigurableReceiving = "postfix";

export async function setupReceiving(
	env: CloudflareEnv,
	domain: DomainRow,
): Promise<void> {
	await getDb(env).update(domains).set({ status: "active", receivingProvider: "postfix" }).where(eq(domains.id, domain.id));
}

export async function removeReceiving(env: CloudflareEnv, domain: DomainRow): Promise<void> {
	await getDb(env).update(domains).set({ receivingProvider: "none" }).where(eq(domains.id, domain.id));
}

export async function receivingPresence(): Promise<Record<string, boolean>> {
	return { postfix: true };
}
