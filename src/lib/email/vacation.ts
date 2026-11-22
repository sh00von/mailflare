import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, routingRules } from "@/db/schema";
import { newId } from "@/lib/ids";
import { getOutboundProviderConfig, sendThroughProvider } from "@/lib/email/outbound-provider";
import { getEmailAddress } from "@/lib/email/address";
import type { ResolvedMailbox } from "@/lib/email/routing";
import type { ParsedEmail } from "@/lib/email/parse";

export type VacationConfig = {
	enabled: boolean;
	startDate: string | null;
	endDate: string | null;
	subject: string;
	messageHtml: string;
};

const VACATION_RULE_NAME = "__vacation_responder__";
const COOLDOWN_DAYS = 4;

/**
 * Retrieve the vacation auto-responder configuration for a mailbox.
 */
export async function getMailboxVacationConfig(
	env: CloudflareEnv,
	mailboxId: string,
): Promise<VacationConfig> {
	const db = getDb(env);
	const [rule] = await db
		.select()
		.from(routingRules)
		.where(
			and(
				eq(routingRules.mailboxId, mailboxId),
				eq(routingRules.scope, "mailbox"),
				eq(routingRules.name, VACATION_RULE_NAME),
			),
		)
		.limit(1);

	if (!rule) {
		return {
			enabled: false,
			startDate: null,
			endDate: null,
			subject: "Out of Office",
			messageHtml: "",
		};
	}

	try {
		const parsed = JSON.parse(rule.matchValue || "{}") as Partial<VacationConfig>;
		return {
			enabled: rule.enabled,
			startDate: parsed.startDate ?? null,
			endDate: parsed.endDate ?? null,
			subject: parsed.subject || "Out of Office",
			messageHtml: parsed.messageHtml || "",
		};
	} catch {
		return {
			enabled: rule.enabled,
			startDate: null,
			endDate: null,
			subject: "Out of Office",
			messageHtml: "",
		};
	}
}

/**
 * Save or update the vacation auto-responder configuration for a mailbox.
 */
export async function setMailboxVacationConfig(
	env: CloudflareEnv,
	userId: string,
	domainId: string,
	mailboxId: string,
	config: VacationConfig,
): Promise<void> {
	const db = getDb(env);
	const [existing] = await db
		.select({ id: routingRules.id })
		.from(routingRules)
		.where(
			and(
				eq(routingRules.mailboxId, mailboxId),
				eq(routingRules.scope, "mailbox"),
				eq(routingRules.name, VACATION_RULE_NAME),
			),
		)
		.limit(1);

	const payloadString = JSON.stringify({
		startDate: config.startDate,
		endDate: config.endDate,
		subject: config.subject,
		messageHtml: config.messageHtml,
	});

	if (existing) {
		await db
			.update(routingRules)
			.set({
				enabled: config.enabled,
				matchValue: payloadString,
			})
			.where(eq(routingRules.id, existing.id));
	} else {
		await db.insert(routingRules).values({
			id: newId("rule"),
			userId,
			domainId,
			mailboxId,
			scope: "mailbox",
			name: VACATION_RULE_NAME,
			enabled: config.enabled,
			pattern: "vacation",
			matchField: "email",
			matchOperator: "exact",
			matchValue: payloadString,
			action: "store",
			priority: -100, // Lowest priority so it doesn't interfere with normal routing
		});
	}
}

/**
 * Evaluates whether an incoming email should receive an automated out-of-office response,
 * and delivers it if all loop-prevention and cooldown criteria pass.
 */
export async function handleInboundVacationResponder(
	env: CloudflareEnv,
	mailbox: ResolvedMailbox,
	parsedEmail: ParsedEmail,
	rawHeaders?: Record<string, string>,
): Promise<void> {
	const vacation = await getMailboxVacationConfig(env, mailbox.mailboxId);
	if (!vacation.enabled) return;

	const now = Date.now();
	if (vacation.startDate && now < new Date(vacation.startDate).getTime()) return;
	if (vacation.endDate && now > new Date(vacation.endDate).getTime()) return;

	const sender = getEmailAddress(parsedEmail.fromAddr || "").toLowerCase().trim();
	if (!sender || sender.includes("mailer-daemon") || sender.includes("noreply") || sender.includes("no-reply")) {
		return;
	}

	// Loop Prevention: Skip automated messages, lists, bounces, and bulk emails (RFC 3834)
	const headers = rawHeaders ?? {};
	const autoSubmitted = (headers["auto-submitted"] || "").toLowerCase();
	if (autoSubmitted && autoSubmitted !== "no") return;

	const precedence = (headers["precedence"] || "").toLowerCase();
	if (precedence === "bulk" || precedence === "junk" || precedence === "list") return;

	if (headers["list-id"] || headers["list-unsubscribe"] || headers["x-auto-response-suppress"]) {
		return;
	}

	// Cooldown Check: Only send at most 1 auto-reply per sender per 4 days
	const db = getDb(env);
	const cooldownDate = new Date(now - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

	const recentReplies = await db
		.select({ id: messages.id })
		.from(messages)
		.where(
			and(
				eq(messages.mailboxId, mailbox.mailboxId),
				eq(messages.direction, "outbound"),
				eq(messages.toAddr, sender),
				gte(messages.createdAt, cooldownDate),
			),
		)
		.limit(1);

	if (recentReplies.length > 0) return;

	const mailboxAddress = `${mailbox.localPart}@${mailbox.hostname}`;
	const subjectPrefix = vacation.subject.trim() || "Out of Office";
	const replySubject = parsedEmail.subject ? `${subjectPrefix}: ${parsedEmail.subject}` : subjectPrefix;
	const bodyContent = vacation.messageHtml.trim() || "<p>Thank you for your email. I am currently out of the office and will respond upon my return.</p>";

	try {
		const outboundConfig = await getOutboundProviderConfig(env, mailboxAddress);
		await sendThroughProvider(env, outboundConfig, {
			from: mailbox.displayName ? `"${mailbox.displayName}" <${mailboxAddress}>` : mailboxAddress,
			to: [sender],
			subject: replySubject,
			html: bodyContent,
			text: bodyContent.replace(/<[^>]*>/g, ""),
			headers: {
				"Auto-Submitted": "auto-replied",
				"Precedence": "bulk",
			},
		});
		console.info(`[Vacation Responder] Sent auto-reply from ${mailboxAddress} to ${sender}`);
	} catch (err) {
		console.error(`[Vacation Responder] Failed to dispatch auto-reply from ${mailboxAddress} to ${sender}:`, err);
	}
}
