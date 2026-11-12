import { getResendKeyStatus } from "@/lib/email/outbound-provider";
import {
	createResendDomain,
	findResendDomain,
	getResendDomain,
	verifyResendDomain,
} from "@/lib/email/resend-api";
import type { ResendDomain } from "@/lib/email/resend-api-types";

export type ResendChecklistRecord = {
	type: "MX" | "TXT" | "CNAME";
	name: string;
	value: string;
	priority?: number;
	added: boolean;
};

export async function ensureResendSendingDomain(
	env: CloudflareEnv,
	hostname: string,
): Promise<{ domain: ResendDomain; records: ResendChecklistRecord[] } | null> {
	const keyStatus = await getResendKeyStatus(env);
	if (!keyStatus.configured || !keyStatus.apiKey) return null;

	const apiKey = keyStatus.apiKey;
	let resendDomain = await findResendDomain(apiKey, hostname);
	if (!resendDomain) {
		resendDomain = await createResendDomain(apiKey, hostname, { sending: true, receiving: false });
	}
	if (resendDomain.status !== "verified") {
		await verifyResendDomain(apiKey, resendDomain.id).catch(() => undefined);
		resendDomain = await getResendDomain(apiKey, resendDomain.id).catch(() => resendDomain!);
	}

	const records: ResendChecklistRecord[] = (resendDomain.records ?? []).map((rec) => ({
		type: rec.type,
		name: rec.name || "@",
		value: rec.value,
		...(rec.priority !== undefined ? { priority: rec.priority } : {}),
		added: rec.status === "verified",
	}));

	return { domain: resendDomain, records };
}

export async function ensureOutboundSendingDomain(
	env: CloudflareEnv,
	hostname: string,
): Promise<{ provider: "resend" | "ses"; verified: boolean; records: ResendChecklistRecord[] } | null> {
	const mode = (
		(env as { OUTBOUND_PROVIDER?: string }).OUTBOUND_PROVIDER ??
		process.env.OUTBOUND_PROVIDER ??
		"auto"
	).trim().toLowerCase();

	if (mode === "ses") {
		const { ensureSesSendingDomain } = await import("@/lib/email/ses-domain-setup");
		const ses = await ensureSesSendingDomain(env, hostname);
		return ses ? { provider: "ses", ...ses } : null;
	}

	try {
		const resend = await ensureResendSendingDomain(env, hostname);
		if (resend) {
			return {
				provider: "resend",
				verified: resend.domain.status === "verified",
				records: resend.records,
			};
		}
	} catch (err) {
		if (mode === "resend") throw err;
		console.warn("[outbound-setup] Resend provisioning failed, attempting SES fallback:", err);
	}

	if (mode === "auto") {
		const { ensureSesSendingDomain } = await import("@/lib/email/ses-domain-setup");
		const ses = await ensureSesSendingDomain(env, hostname);
		if (ses) return { provider: "ses", ...ses };
	}

	return null;
}

