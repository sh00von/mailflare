import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { messages, messageAttachments } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	const access = await getMailboxAccessLevel(db, user, id);
	if (!access) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const [msgStats] = await db
		.select({
			count: sql<number>`count(${messages.id})`,
			textLength: sql<number>`coalesce(sum(length(${messages.textBody})), 0)`,
			htmlLength: sql<number>`coalesce(sum(length(${messages.htmlBody})), 0)`,
		})
		.from(messages)
		.where(eq(messages.mailboxId, id));

	const [attStats] = await db
		.select({
			count: sql<number>`count(${messageAttachments.id})`,
			totalSize: sql<number>`coalesce(sum(${messageAttachments.size}), 0)`,
		})
		.from(messageAttachments)
		.innerJoin(messages, eq(messageAttachments.messageId, messages.id))
		.where(eq(messages.mailboxId, id));

	const messageCount = Number(msgStats?.count ?? 0);
	const messagesSizeBytes = Number(msgStats?.textLength ?? 0) + Number(msgStats?.htmlLength ?? 0);
	const attachmentCount = Number(attStats?.count ?? 0);
	const attachmentsSizeBytes = Number(attStats?.totalSize ?? 0);
	const totalSizeBytes = messagesSizeBytes + attachmentsSizeBytes;

	// Base 1 GB quota per mailbox
	const quotaBytes = 1024 * 1024 * 1024;
	const usagePercentage = Math.min(100, Math.round((totalSizeBytes / quotaBytes) * 1000) / 10);

	return NextResponse.json({
		mailboxId: id,
		messageCount,
		attachmentCount,
		messagesSizeBytes,
		attachmentsSizeBytes,
		totalSizeBytes,
		quotaBytes,
		usagePercentage,
		formatted: {
			total: formatBytes(totalSizeBytes),
			messages: formatBytes(messagesSizeBytes),
			attachments: formatBytes(attachmentsSizeBytes),
			quota: formatBytes(quotaBytes),
		},
	});
}
