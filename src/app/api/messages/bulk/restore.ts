import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { folders, messages, spamFeedback } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { createAuditLog } from "@/lib/mailboxes/audit";
import { revertSpamFeedback } from "@/lib/spam/feedback";
import type { BulkMessagePlacement } from "./types";
import { isValidRestoreTarget, MAX_RESTORE_ITEMS } from "./utils";

/** The placement of each message before a move, for the move's Undo. */
export async function readPlacements(db: ReturnType<typeof getDb>, rows: Array<typeof messages.$inferSelect>): Promise<BulkMessagePlacement[]> {
	if (rows.length === 0) return [];
	const feedback = await db
		.select({ messageId: spamFeedback.messageId, classification: spamFeedback.classification })
		.from(spamFeedback)
		.where(inArray(spamFeedback.messageId, rows.map((row) => row.id)));
	const classifications = new Map(feedback.map((row) => [row.messageId, row.classification]));
	return rows.map((row) => ({
		id: row.id,
		status: row.status,
		folderId: row.folderId ?? null,
		snoozedUntil: row.snoozedUntil ? row.snoozedUntil.getTime() : null,
		spamClassification: classifications.get(row.id) ?? null,
	}));
}

function isPlacement(value: unknown): value is BulkMessagePlacement {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return typeof item.id === "string"
		&& typeof item.status === "string"
		&& (item.folderId === null || typeof item.folderId === "string")
		&& (item.snoozedUntil === null || (typeof item.snoozedUntil === "number" && Number.isFinite(item.snoozedUntil)))
		&& (item.spamClassification === null || item.spamClassification === "spam" || item.spamClassification === "ham");
}

/**
 * Undo a move: put each message back exactly where the move found it (status, folder, snooze) and revert any
 * Spam / Not spam training the move added. Every item is checked like a move would be: the user must be able
 * to manage the mailbox, the status must be one a move could have come from, and a folder must belong to the
 * same mailbox. Items that fail are skipped, not fatal.
 */
export async function restoreMessagePlacements(env: CloudflareEnv, user: SessionUser, rawItems: unknown): Promise<Response> {
	if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_RESTORE_ITEMS || !rawItems.every(isPlacement)) {
		return NextResponse.json({ error: "Nothing to restore" }, { status: 400 });
	}
	const items = rawItems as BulkMessagePlacement[];
	const db = getDb(env);
	const rows = await db.select().from(messages).where(inArray(messages.id, items.map((item) => item.id)));
	if (rows.length === 0) return NextResponse.json({ error: "These messages can no longer be restored." }, { status: 409 });
	const byId = new Map(rows.map((row) => [row.id, row]));
	const folderIds = [...new Set(items.map((item) => item.folderId).filter((id): id is string => !!id))];
	const folderRows = folderIds.length
		? await db.select({ id: folders.id, mailboxId: folders.mailboxId }).from(folders).where(inArray(folders.id, folderIds))
		: [];
	const folderMailbox = new Map(folderRows.map((row) => [row.id, row.mailboxId]));
	const feedback = await db
		.select({ messageId: spamFeedback.messageId, classification: spamFeedback.classification })
		.from(spamFeedback)
		.where(inArray(spamFeedback.messageId, rows.map((row) => row.id)));
	const currentClassification = new Map(feedback.map((row) => [row.messageId, row.classification]));
	const accessByMailbox = new Map<string, boolean>();

	let restored = 0;
	for (const item of items) {
		const message = byId.get(item.id);
		if (!message?.mailboxId) continue;
		if (!accessByMailbox.has(message.mailboxId)) {
			accessByMailbox.set(message.mailboxId, !!(await getMailboxAccessLevel(db, user, message.mailboxId))?.canManage);
		}
		if (!accessByMailbox.get(message.mailboxId)) continue;
		if (!isValidRestoreTarget(message.direction, item.status, !!item.folderId)) continue;
		if (item.folderId && folderMailbox.get(item.folderId) !== message.mailboxId) continue;

		if ((currentClassification.get(message.id) ?? null) !== item.spamClassification) {
			if (!(await revertSpamFeedback(env, user, message.id, item.spamClassification))) continue;
		}
		await db.update(messages).set({
			status: item.status,
			folderId: item.folderId,
			snoozedUntil: item.snoozedUntil === null ? null : new Date(item.snoozedUntil),
		}).where(inArray(messages.id, [message.id]));
		await createAuditLog(env, {
			actorUserId: user.id,
			mailboxId: message.mailboxId,
			messageId: message.id,
			action: "email.restore",
			metadata: { status: item.status, folderId: item.folderId },
		});
		restored += 1;
	}
	if (restored === 0) return NextResponse.json({ error: "These messages can no longer be restored." }, { status: 409 });
	return NextResponse.json({ ok: true, restored, skipped: items.length - restored });
}
