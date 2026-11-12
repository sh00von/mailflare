import { getAwsConfig } from "@/lib/aws/config";
import { createSesIdentity, getSesIdentity } from "@/lib/aws/ses";
import type { ResendChecklistRecord } from "@/lib/email/resend-domain-setup";

export async function ensureSesSendingDomain(
	env: CloudflareEnv,
	hostname: string,
): Promise<{ verified: boolean; records: ResendChecklistRecord[] } | null> {
	const config = await getAwsConfig(env);
	if (!config) return null;

	let identity = await getSesIdentity(config, hostname);
	if (!identity.registered) {
		identity = await createSesIdentity(config, hostname);
	}

	const records: ResendChecklistRecord[] = identity.records.map((rec) => ({
		type: rec.type,
		name: rec.name.replace(new RegExp(`\\.${hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), ""),
		value: rec.value,
		added: identity.verified,
	}));

	return { verified: identity.verified, records };
}

