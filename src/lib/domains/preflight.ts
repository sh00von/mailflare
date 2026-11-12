import type { DomainPreflightResult } from "@/lib/domains/types";

export async function preflightDomain(
	_env: CloudflareEnv,
	hostname: string,
): Promise<DomainPreflightResult> {
	const normalized = hostname.toLowerCase().trim();
	return { hostname: normalized, zone: { id: "manual", name: normalized } };
}
