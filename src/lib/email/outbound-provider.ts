import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEmailAddress } from "@/lib/email/address";
import type { OutboundProviderConfig, OutboundProviderMessage } from "@/lib/email/outbound-provider-types";

/**
 * Outbound mail routing: exclusively uses our self-hosted unexposed Postfix engine.
 * No third-party mail services (Resend, SES, Cloudflare) are used.
 */
export async function getOutboundProviderConfig(env: CloudflareEnv, fromAddress: string): Promise<OutboundProviderConfig> {
	const hostname = getEmailAddress(fromAddress).split("@")[1]?.toLowerCase();
	const [domain] = hostname
		? await getDb(env)
				.select({
					dkimPrivateKey: domains.dkimPrivateKey,
					dkimSelector: domains.dkimSelector,
				})
				.from(domains)
				.where(eq(domains.hostname, hostname))
				.limit(1)
		: [];

	return {
		provider: "postfix",
		dkimPrivateKey: domain?.dkimPrivateKey ?? null,
		dkimSelector: domain?.dkimSelector ?? "default",
	};
}

export async function sendThroughProvider(
	env: CloudflareEnv,
	config: OutboundProviderConfig,
	message: OutboundProviderMessage,
	_idempotencyKey?: string,
): Promise<{ messageId: string }> {
	const fromDomain = getEmailAddress(message.from).split("@")[1] || "";
	const dkimConfig =
		config.dkimPrivateKey
			? {
					domainName: fromDomain,
					keySelector: config.dkimSelector ?? "default",
					privateKey: config.dkimPrivateKey,
			  }
			: undefined;

	const response = await env.EMAIL.send({
		from: message.from,
		to: message.to,
		...(message.cc?.length ? { cc: message.cc } : {}),
		...(message.bcc?.length ? { bcc: message.bcc } : {}),
		subject: message.subject,
		headers: message.headers && Object.keys(message.headers).length ? message.headers : undefined,
		html: message.html,
		text: message.text,
		attachments: message.attachments?.map((attachment) =>
			attachment.disposition === "inline" && attachment.contentId
				? { filename: attachment.filename, type: attachment.type, content: attachment.content, disposition: "inline" as const, contentId: attachment.contentId }
				: { filename: attachment.filename, type: attachment.type, content: attachment.content, disposition: "attachment" as const },
		),
		...(dkimConfig ? { dkim: dkimConfig } : {}),
	});
	return { messageId: response.messageId };
}
