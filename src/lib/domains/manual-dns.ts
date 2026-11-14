import type { DomainDnsView } from "@/lib/domains/service";

/**
 * The DNS a self-hosted install needs when Replyot is not managing the
 * zone. Rendered as "missing" until the operator confirms, since the app
 * cannot read their DNS; the records are what the SMTP listener and an
 * SMTP relay expect.
 */
export async function getManualDomainDns(env: CloudflareEnv, hostname: string): Promise<DomainDnsView> {
	const mailHost = process.env.MAIL_HOSTNAME?.trim() || `mail.${hostname}`;
	const hasResend = !!process.env.RESEND_API_KEY;
	const spfInclude = hasResend ? "include:resend.com" : "";
	const spfContent = `v=spf1 a:${mailHost} ${spfInclude} ~all`.replace(/\s+/g, " ").trim();
	const records = [
		{ type: "MX", name: hostname, content: `10 ${mailHost}`, ttl: 3600 },
		{ type: "TXT", name: hostname, content: spfContent, ttl: 3600 },
		{ type: "TXT", name: `_dmarc.${hostname}`, content: "v=DMARC1; p=none", ttl: 3600 },
	];
	if (hasResend) {
		records.push({
			type: "TXT",
			name: `resend._domainkey.${hostname}`,
			content: "p=YOUR_DKIM_PUBLIC_KEY",
			ttl: 3600,
		});
	}
	const mailer = env.EMAIL as unknown as { configured?: boolean };
	return {
		routing: { records: [], missing: records, status: "manual" },
		sending: [],
		sendingEnabled: mailer?.configured === true || hasResend,
	};
}
