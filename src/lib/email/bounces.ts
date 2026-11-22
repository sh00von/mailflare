import type { ParsedEmail } from "./parse";

export type BounceClassification = "hard" | "soft";

export interface ParsedBounceReport {
	isBounce: boolean;
	recipient?: string;
	bounceType?: BounceClassification;
	status?: string;
	action?: string;
	diagnosticCode?: string;
	originalMessageId?: string;
	explanation?: string;
}

const BOUNCE_SENDERS = ["mailer-daemon", "postmaster"];
const BOUNCE_SUBJECT_PATTERNS = [
	/delivery status notification/i,
	/undelivered mail/i,
	/mail delivery failed/i,
	/failure notice/i,
	/returned to sender/i,
];

/**
 * Parses RFC 3464 Delivery Status Notifications (DSNs) and Postfix/remote bounce receipts.
 */
export function parseBounceReport(parsed: ParsedEmail, rawMimeText?: string): ParsedBounceReport {
	const sender = (parsed.fromAddr || "").toLowerCase();
	const subject = parsed.subject || "";

	const isFromDaemon = BOUNCE_SENDERS.some((daemon) => sender.includes(daemon));
	const isBounceSubject = BOUNCE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));

	const fullText = [
		parsed.text || "",
		parsed.html || "",
		rawMimeText || "",
	].join("\n");

	if (!isFromDaemon && !isBounceSubject && !fullText.includes("Final-Recipient") && !fullText.includes("Status: 5.") && !fullText.includes("Status: 4.")) {
		return { isBounce: false };
	}

	// Extract Final-Recipient (RFC 3464: "Final-Recipient: rfc822; user@example.com" or "To: <user@example.com>")
	let recipient: string | undefined;
	const recipientMatch = fullText.match(/Final-Recipient:\s*(?:rfc822;)?\s*<?([^\s<>;]+@[^\s<>;]+)>?/i)
		|| fullText.match(/Original-Recipient:\s*(?:rfc822;)?\s*<?([^\s<>;]+@[^\s<>;]+)>?/i)
		|| fullText.match(/<([^\s<>;]+@[^\s<>;]+)>:\s*(?:host\s+.+\s+said:)?\s*[45]\d\d/i)
		|| fullText.match(/Failed to deliver to\s+<?([^\s<>;]+@[^\s<>;]+)>?/i);

	if (recipientMatch) {
		recipient = recipientMatch[1].trim().toLowerCase();
	}

	// Extract Status code (e.g., 5.1.1, 4.2.2)
	let status: string | undefined;
	const statusMatch = fullText.match(/Status:\s*([45]\.\d+\.\d+)/i)
		|| fullText.match(/\b([45]\.\d+\.\d+)\b/);

	if (statusMatch) {
		status = statusMatch[1];
	}

	// Extract Action (e.g., failed, delayed)
	let action = "failed";
	const actionMatch = fullText.match(/Action:\s*([a-zA-Z-]+)/i);
	if (actionMatch) {
		action = actionMatch[1].toLowerCase();
	}

	// Extract Diagnostic-Code
	let diagnosticCode: string | undefined;
	const diagMatch = fullText.match(/Diagnostic-Code:\s*(?:smtp;)?\s*([^\r\n]+(?:\r?\n\s+[^\r\n]+)*)/i)
		|| fullText.match(/(?:host\s+.+\s+said:\s*)([45]\d\d[^\r\n]+)/i);

	if (diagMatch) {
		diagnosticCode = diagMatch[1].replace(/\r?\n\s+/g, " ").trim();
	}

	// Extract original Message-ID
	let originalMessageId: string | undefined;
	const msgIdMatch = fullText.match(/Original-Message-ID:\s*<([^>]+)>/i)
		|| fullText.match(/Message-ID:\s*<([^>]+)>/ig);

	if (msgIdMatch) {
		// Take the last Message-ID if multiple found, as original message headers are appended at the bottom
		const last = Array.isArray(msgIdMatch) ? msgIdMatch[msgIdMatch.length - 1] : msgIdMatch[1];
		const cleanId = last.replace(/Message-ID:\s*<?/i, "").replace(/>?$/, "").trim();
		if (cleanId && cleanId !== parsed.messageId) {
			originalMessageId = cleanId;
		}
	}

	// Classify bounce severity
	let bounceType: BounceClassification = "hard";
	if (status?.startsWith("4.") || action === "delayed") {
		bounceType = "soft";
	} else if (status?.startsWith("5.")) {
		bounceType = "hard";
	} else if (diagnosticCode && /^[4]\d\d/.test(diagnosticCode)) {
		bounceType = "soft";
	}

	return {
		isBounce: true,
		recipient,
		bounceType,
		status,
		action,
		diagnosticCode,
		originalMessageId,
		explanation: diagnosticCode || status || "Delivery failed",
	};
}
