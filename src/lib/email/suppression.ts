import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { messages, suppressionList } from "@/db/schema";
import { newId } from "@/lib/ids";
import type { BounceClassification, ParsedBounceReport } from "./bounces";

export interface SuppressionCheckResult {
	suppressed: boolean;
	email: string;
	reason?: string;
	details?: string;
}

/**
 * Checks whether an email address is currently blocked in the suppression list.
 */
export async function isSuppressed(
	db: AppDatabase,
	email: string,
	workspaceId?: string | null,
): Promise<SuppressionCheckResult> {
	const cleanEmail = email.trim().toLowerCase();
	const conditions = [
		eq(suppressionList.email, cleanEmail),
		eq(suppressionList.status, "active"),
	];

	if (workspaceId) {
		conditions.push(
			sql`(${suppressionList.workspaceId} = ${workspaceId} OR ${suppressionList.workspaceId} IS NULL)` as never,
		);
	}

	const [entry] = await db
		.select({
			id: suppressionList.id,
			email: suppressionList.email,
			reason: suppressionList.reason,
			details: suppressionList.details,
		})
		.from(suppressionList)
		.where(and(...conditions))
		.limit(1);

	if (entry) {
		return {
			suppressed: true,
			email: cleanEmail,
			reason: entry.reason,
			details: entry.details ?? undefined,
		};
	}

	return { suppressed: false, email: cleanEmail };
}

/**
 * Pre-flight check for multiple recipient addresses (To, Cc, Bcc).
 * Returns array of suppressed recipients, if any.
 */
export async function checkRecipientsSuppressed(
	db: AppDatabase,
	emails: string[],
	workspaceId?: string | null,
): Promise<SuppressionCheckResult[]> {
	const cleanEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
	if (cleanEmails.length === 0) return [];

	const conditions = [
		inArray(suppressionList.email, cleanEmails),
		eq(suppressionList.status, "active"),
	];

	if (workspaceId) {
		conditions.push(
			sql`(${suppressionList.workspaceId} = ${workspaceId} OR ${suppressionList.workspaceId} IS NULL)` as never,
		);
	}

	const entries = await db
		.select({
			email: suppressionList.email,
			reason: suppressionList.reason,
			details: suppressionList.details,
		})
		.from(suppressionList)
		.where(and(...conditions));

	return entries.map((entry) => ({
		suppressed: true,
		email: entry.email,
		reason: entry.reason,
		details: entry.details ?? undefined,
	}));
}

/**
 * Records a bounce event using Smart Suppression rules:
 * - Hard bounces (5xx, user unknown): 1-strike immediate permanent suppression.
 * - Soft bounces (4xx, mailbox full): suppressed only after 3 consecutive strikes over 7 days.
 */
export async function handleBounceEvent(
	db: AppDatabase,
	report: ParsedBounceReport,
	workspaceId?: string | null,
): Promise<void> {
	if (!report.isBounce || !report.recipient) return;

	const cleanEmail = report.recipient.trim().toLowerCase();
	const bounceType = report.bounceType ?? "hard";
	const bounceCode = report.status || (bounceType === "hard" ? "5.1.1" : "4.2.2");
	const now = new Date();

	// Check if this address is already recorded
	const [existing] = await db
		.select()
		.from(suppressionList)
		.where(
			and(
				eq(suppressionList.email, cleanEmail),
				workspaceId ? eq(suppressionList.workspaceId, workspaceId) : sql`1=1`,
			),
		)
		.limit(1);

	if (bounceType === "hard") {
		// Immediate suppression
		if (existing) {
			await db
				.update(suppressionList)
				.set({
					status: "active",
					reason: "hard_bounce",
					bounceCode,
					bounceCount: existing.bounceCount + 1,
					details: report.diagnosticCode || report.explanation || existing.details,
					updatedAt: now,
				})
				.where(eq(suppressionList.id, existing.id));
		} else {
			await db.insert(suppressionList).values({
				id: newId(),
				workspaceId: workspaceId ?? null,
				email: cleanEmail,
				reason: "hard_bounce",
				status: "active",
				bounceCode,
				bounceCount: 1,
				details: report.diagnosticCode || report.explanation,
				createdAt: now,
				updatedAt: now,
			});
		}
	} else {
		// Soft bounce: 3-strike threshold within 7 days
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		if (existing) {
			const recent = existing.updatedAt >= sevenDaysAgo;
			const newCount = recent ? existing.bounceCount + 1 : 1;
			const shouldSuppress = newCount >= 3;

			await db
				.update(suppressionList)
				.set({
					status: shouldSuppress ? "active" : existing.status,
					reason: "soft_bounce",
					bounceCode,
					bounceCount: newCount,
					details: report.diagnosticCode || report.explanation || existing.details,
					updatedAt: now,
				})
				.where(eq(suppressionList.id, existing.id));
		} else {
			await db.insert(suppressionList).values({
				id: newId(),
				workspaceId: workspaceId ?? null,
				email: cleanEmail,
				reason: "soft_bounce",
				status: "cleared", // Not blocked on first soft bounce strike
				bounceCode,
				bounceCount: 1,
				details: report.diagnosticCode || report.explanation,
				createdAt: now,
				updatedAt: now,
			});
		}
	}

	// If original message is found, flag delivery status as bounced
	if (report.originalMessageId) {
		try {
			await db
				.update(messages)
				.set({
					status: "bounced",
				})
				.where(eq(messages.id, report.originalMessageId));
		} catch (err) {
			console.warn("Failed to update original bounced message status:", err);
		}
	}
}

/**
 * Lists active suppressions for dashboard viewing.
 */
export async function listSuppressedAddresses(
	db: AppDatabase,
	workspaceId?: string | null,
	limit = 50,
	offset = 0,
) {
	const conditions = [eq(suppressionList.status, "active")];
	if (workspaceId) {
		conditions.push(
			sql`(${suppressionList.workspaceId} = ${workspaceId} OR ${suppressionList.workspaceId} IS NULL)` as never,
		);
	}

	return db
		.select()
		.from(suppressionList)
		.where(and(...conditions))
		.orderBy(desc(suppressionList.updatedAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Manually unblocks an address from the suppression list.
 */
/**
 * Manually unblocks an address from the suppression list.
 */
export async function clearSuppressionEntry(
	db: AppDatabase,
	id: string,
	workspaceId?: string | null,
): Promise<boolean> {
	const conditions = [eq(suppressionList.id, id)];
	if (workspaceId) {
		conditions.push(eq(suppressionList.workspaceId, workspaceId));
	}

	await db
		.update(suppressionList)
		.set({ status: "cleared", updatedAt: new Date() })
		.where(and(...conditions));

	return true;
}

/**
 * Cleans expired soft-bounces older than 90 days.
 */
export async function pruneExpiredSuppression(db: AppDatabase): Promise<void> {
	const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
	try {
		await db
			.update(suppressionList)
			.set({ status: "cleared", updatedAt: new Date() })
			.where(
				and(
					eq(suppressionList.reason, "soft_bounce"),
					eq(suppressionList.status, "active"),
					sql`${suppressionList.updatedAt} < ${ninetyDaysAgo}`,
				),
			);
	} catch (err) {
		console.warn("Failed to prune expired soft bounces:", err);
	}
}
