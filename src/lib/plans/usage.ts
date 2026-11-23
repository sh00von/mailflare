import { and, count, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, messageAttachments, messages, users, workspaces } from "@/db/schema";
import { newId } from "@/lib/ids";
import { getPlanDefinition, resolveBillingCycle, resolvePlanId, TRIAL_DAYS, type BillingCycle, type PlanDefinition, type PlanId, type WorkspaceStatus } from "./catalog";

export type WorkspaceSummary = {
	id: string;
	name: string;
	ownerUserId: string | null;
	plan: PlanId;
	planDetails: PlanDefinition;
	status: WorkspaceStatus;
	trialEndsAt: string | null;
	trialExpired: boolean;
	daysLeftInTrial: number | null;
	maxMailboxes: number;
	billingCycle: BillingCycle;
	hasStorageAddon?: boolean;
	extraMailboxesCount?: number;
};

export type WorkspaceUsage = {
	domainsUsed: number;
	mailboxesUsed: number;
	storageUsedBytes: number;
	dailySentCount: number;
	hourlySentCount: number;
};

export type WorkspaceWithUsage = {
	workspace: WorkspaceSummary;
	usage: WorkspaceUsage;
};

function toSummary(row: typeof workspaces.$inferSelect): WorkspaceSummary {
	const rawPlan = resolvePlanId(row.plan);
	const now = Date.now();
	const trialEndsMs = row.trialEndsAt ? row.trialEndsAt.getTime() : null;
	const isTrial = row.status === "trialing";
	const trialExpired = isTrial && trialEndsMs !== null && trialEndsMs < now;
	const daysLeftInTrial =
		isTrial && trialEndsMs !== null
			? Math.max(0, Math.ceil((trialEndsMs - now) / (24 * 60 * 60 * 1000)))
			: null;

	// If trial expired and user hasn't subscribed, gracefully fall back to Free plan
	const plan: PlanId = trialExpired ? "free" : isTrial ? "pro" : rawPlan;
	const basePlan = getPlanDefinition(plan);

	const hasStorageAddon = Boolean(row.stripePriceId?.includes("addon_storage_20gb"));
	const extraStorageBytes = hasStorageAddon ? 20 * 1024 * 1024 * 1024 : 0;
	const totalStorageLimitBytes = basePlan.storageLimitBytes + extraStorageBytes;
	const storageLabel = hasStorageAddon
		? `${Math.round(totalStorageLimitBytes / (1024 * 1024 * 1024))} GB (+20 GB Add-on)`
		: basePlan.storageLabel;

	const effectiveMaxMailboxes = Math.max(row.maxMailboxes ?? 0, basePlan.maxMailboxes);

	const planDetails: PlanDefinition = {
		...(isTrial && !trialExpired
			? {
					...getPlanDefinition("pro"),
					tagline: "14-Day Free Pro Trial (All team features included)",
			  }
			: basePlan),
		maxMailboxes: effectiveMaxMailboxes,
		storageLimitBytes: totalStorageLimitBytes,
		storageLabel,
	};

	const billingCycle = resolveBillingCycle(row.billingCycle);

	return {
		id: row.id,
		name: row.name,
		ownerUserId: row.ownerUserId,
		plan,
		planDetails,
		status: row.status as WorkspaceStatus,
		trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
		trialExpired,
		daysLeftInTrial,
		maxMailboxes: effectiveMaxMailboxes,
		billingCycle,
		hasStorageAddon,
		extraMailboxesCount: Math.max(0, (row.maxMailboxes ?? 0) - basePlan.maxMailboxes),
	};
}

export async function createWorkspaceForOwner(
	env: CloudflareEnv,
	input: { ownerUserId: string; name: string; plan: PlanId; status?: WorkspaceStatus; trialEndsAt?: Date | null },
) {
	const db = getDb(env);
	const id = newId("ws");
	const status: WorkspaceStatus = input.status ?? "trialing";
	const trialEndsAt = input.trialEndsAt !== undefined ? input.trialEndsAt : (status === "trialing" ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null);
	await db.insert(workspaces).values({
		id,
		name: input.name,
		ownerUserId: input.ownerUserId,
		plan: (input.plan === "free" ? "starter" : input.plan) as "starter" | "pro" | "business",
		status,
		trialEndsAt,
	});
	return id;
}

export async function getOrEnsureWorkspaceForUser(
	env: CloudflareEnv,
	user: { id: string; name: string; email?: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
): Promise<WorkspaceSummary> {
	const db = getDb(env);
	let workspaceId = user.workspaceId ?? null;

	if (!workspaceId && user.createdByUserId) {
		const [creator] = await db
			.select({ workspaceId: users.workspaceId })
			.from(users)
			.where(eq(users.id, user.createdByUserId))
			.limit(1);
		if (creator?.workspaceId) {
			workspaceId = creator.workspaceId;
			await db.update(users).set({ workspaceId }).where(eq(users.id, user.id));
		}
	}

	if (workspaceId) {
		const [existing] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
		if (existing) return toSummary(existing);
	}

	// Look up if a workspace already exists for this owner before creating a duplicate
	const [existingForOwner] = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerUserId, user.id))
		.limit(1);
	if (existingForOwner) {
		await db.update(users).set({ workspaceId: existingForOwner.id }).where(eq(users.id, user.id));
		return toSummary(existingForOwner);
	}

	// Backfill a workspace for pre-existing accounts.
	const plan: PlanId = user.isPrimaryAdmin ? "business" : "pro";
	const status: WorkspaceStatus = user.isPrimaryAdmin ? "active" : "trialing";
	const fallbackName = (user.name && user.name.trim()) ? user.name.trim() : (user.email ? user.email.split("@")[0] : "My");
	const newWorkspaceId = await createWorkspaceForOwner(env, {
		ownerUserId: user.id,
		name: `${fallbackName}'s Workspace`,
		plan,
		status,
	});

	await db.update(users).set({ workspaceId: newWorkspaceId }).where(eq(users.id, user.id));
	await db.update(domains).set({ workspaceId: newWorkspaceId }).where(and(eq(domains.userId, user.id), isNull(domains.workspaceId)));

	const [created] = await db.select().from(workspaces).where(eq(workspaces.id, newWorkspaceId)).limit(1);
	return toSummary(created!);
}

export async function getWorkspaceUsage(env: CloudflareEnv, workspaceId: string): Promise<WorkspaceUsage> {
	const db = getDb(env);
	const wsDomains = await db.select({ id: domains.id }).from(domains).where(eq(domains.workspaceId, workspaceId));
	const wsUsers = await db.select({ id: users.id }).from(users).where(eq(users.workspaceId, workspaceId));

	const domainIds = wsDomains.map((d) => d.id);
	const userIds = wsUsers.map((u) => u.id);

	const wsMailboxes =
		domainIds.length > 0
			? await db.select({ id: mailboxes.id }).from(mailboxes).where(inArray(mailboxes.domainId, domainIds))
			: userIds.length > 0
				? await db.select({ id: mailboxes.id }).from(mailboxes).where(inArray(mailboxes.userId, userIds))
				: [];

	const mailboxIds = wsMailboxes.map((m) => m.id);
	if (mailboxIds.length === 0) {
		return { domainsUsed: domainIds.length, mailboxesUsed: 0, storageUsedBytes: 0, dailySentCount: 0, hourlySentCount: 0 };
	}

	const startOfUtcDay = new Date();
	startOfUtcDay.setUTCHours(0, 0, 0, 0);
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	const [[attStats], [dailySentStats], [hourlySentStats]] = await Promise.all([
		db
			.select({ total: sql<number>`coalesce(sum(${messageAttachments.size}), 0)` })
			.from(messageAttachments)
			.innerJoin(messages, eq(messages.id, messageAttachments.messageId))
			.where(inArray(messages.mailboxId, mailboxIds)),
		db
			.select({ total: count() })
			.from(messages)
			.where(
				and(
					inArray(messages.mailboxId, mailboxIds),
					eq(messages.direction, "outbound"),
					ne(messages.status, "draft"),
					ne(messages.status, "failed"),
					gte(messages.createdAt, startOfUtcDay),
				),
			),
		db
			.select({ total: count() })
			.from(messages)
			.where(
				and(
					inArray(messages.mailboxId, mailboxIds),
					eq(messages.direction, "outbound"),
					ne(messages.status, "draft"),
					ne(messages.status, "failed"),
					gte(messages.createdAt, oneHourAgo),
				),
			),
	]);

	return {
		domainsUsed: domainIds.length,
		mailboxesUsed: mailboxIds.length,
		storageUsedBytes: Number(attStats?.total ?? 0),
		dailySentCount: Number(dailySentStats?.total ?? 0),
		hourlySentCount: Number(hourlySentStats?.total ?? 0),
	};
}

export async function getWorkspaceWithUsage(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
): Promise<WorkspaceWithUsage> {
	const workspace = await getOrEnsureWorkspaceForUser(env, user);
	const usage = await getWorkspaceUsage(env, workspace.id);
	return { workspace, usage };
}

export function checkWorkspaceActive(workspace: WorkspaceSummary): string | null {
	if (workspace.status === "suspended") {
		return "This workspace is suspended. Contact support or reactivate your plan.";
	}
	if (workspace.trialExpired) {
		return `Your ${workspace.planDetails.name} 7-day trial has ended. Upgrade or activate your plan in Plan & Usage.`;
	}
	return null;
}

export async function checkCanAddDomain(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
): Promise<{ ok: true; workspace: WorkspaceSummary } | { ok: false; error: string }> {
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return { ok: false, error: inactive };
	const maxDomains = workspace.status === "trialing" ? 1 : workspace.planDetails.maxDomains;
	if (usage.domainsUsed >= maxDomains) {
		return {
			ok: false,
			error: workspace.status === "trialing"
				? "Your 7-day free trial allows 1 domain. Upgrade your plan in Plan & Usage to add more domains."
				: `${workspace.planDetails.name} plan allows up to ${workspace.planDetails.maxDomains} domain(s). Upgrade your plan to add more domains.`,
		};
	}
	return { ok: true, workspace };
}

export async function checkCanAddMailbox(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
): Promise<{ ok: true; workspace: WorkspaceSummary } | { ok: false; error: string }> {
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return { ok: false, error: inactive };
	const maxMailboxes = workspace.status === "trialing" ? 1 : workspace.planDetails.maxMailboxes;
	if (usage.mailboxesUsed >= maxMailboxes) {
		return {
			ok: false,
			error: workspace.status === "trialing"
				? "Your 7-day free trial allows 1 mailbox. Upgrade your plan in Plan & Usage to add more team members."
				: `${workspace.planDetails.name} plan allows up to ${workspace.planDetails.maxMailboxes} mailbox(es). Upgrade your plan to add more team members.`,
		};
	}
	return { ok: true, workspace };
}

export async function getMailboxStorageUsed(env: CloudflareEnv, mailboxId: string): Promise<number> {
	const db = getDb(env);
	const [attStats] = await db
		.select({ total: sql<number>`coalesce(sum(${messageAttachments.size}), 0)` })
		.from(messageAttachments)
		.innerJoin(messages, eq(messages.id, messageAttachments.messageId))
		.where(eq(messages.mailboxId, mailboxId));
	return Number(attStats?.total ?? 0);
}

export async function checkCanSendEmail(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
	attachmentBytes = 0,
	mailboxId?: string,
): Promise<{ ok: true; workspace: WorkspaceSummary } | { ok: false; error: string }> {
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return { ok: false, error: inactive };
	if (usage.hourlySentCount >= workspace.planDetails.hourlySendLimit) {
		return {
			ok: false,
			error: workspace.status === "trialing"
				? `Free trial hourly sending limit reached (${workspace.planDetails.hourlySendLimit} emails/hour). Upgrade your plan in Plan & Usage for higher volume.`
				: `Hourly sending limit reached (${workspace.planDetails.hourlySendLimit} emails/hour on ${workspace.planDetails.name}). Please try again later or upgrade for higher volume.`,
		};
	}
	if (usage.dailySentCount >= workspace.planDetails.dailySendLimit) {
		return {
			ok: false,
			error: workspace.status === "trialing"
				? `Free trial daily sending limit reached (${workspace.planDetails.dailySendLimit} emails/day). Upgrade your plan in Plan & Usage for higher daily limits.`
				: `Daily sending limit reached (${workspace.planDetails.dailySendLimit} emails/day on ${workspace.planDetails.name}). Upgrade your plan for higher daily limits.`,
		};
	}
	if (usage.storageUsedBytes + attachmentBytes > workspace.planDetails.storageLimitBytes) {
		return {
			ok: false,
			error: `Workspace storage limit reached (${workspace.planDetails.storageLabel} on ${workspace.planDetails.name}). Delete old emails or upgrade your plan to send.`,
		};
	}
	if (mailboxId && workspace.planDetails.storagePerMailboxBytes) {
		const mailboxUsed = await getMailboxStorageUsed(env, mailboxId);
		if (mailboxUsed + attachmentBytes > workspace.planDetails.storagePerMailboxBytes) {
			return {
				ok: false,
				error: `Mailbox storage quota reached (1 GB on ${workspace.planDetails.name}). Delete old emails with attachments before sending.`,
			};
		}
	}
	const maxAttachmentBytes = workspace.planDetails.maxAttachmentMb * 1024 * 1024;
	if (attachmentBytes > maxAttachmentBytes) {
		return {
			ok: false,
			error: `${workspace.planDetails.name} plan allows attachments up to ${workspace.planDetails.maxAttachmentMb} MB per email.`,
		};
	}
	return { ok: true, workspace };
}

export async function checkCanAddAttachment(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
	newBytes: number,
	totalDraftBytes = newBytes,
): Promise<{ ok: true; workspace: WorkspaceSummary } | { ok: false; error: string }> {
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return { ok: false, error: inactive };
	const maxAttachmentBytes = workspace.planDetails.maxAttachmentMb * 1024 * 1024;
	if (totalDraftBytes > maxAttachmentBytes) {
		return {
			ok: false,
			error: `${workspace.planDetails.name} plan allows attachments up to ${workspace.planDetails.maxAttachmentMb} MB per email.`,
		};
	}
	if (usage.storageUsedBytes + newBytes > workspace.planDetails.storageLimitBytes) {
		return {
			ok: false,
			error: `Workspace storage limit reached (${workspace.planDetails.storageLabel} on ${workspace.planDetails.name}). Delete old emails or upgrade your plan.`,
		};
	}
	return { ok: true, workspace };
}

export async function checkCanReceiveStorage(
	env: CloudflareEnv,
	userId: string,
	incomingBytes: number,
	mailboxId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const db = getDb(env);
	const [owner] = await db
		.select({ id: users.id, name: users.name, workspaceId: users.workspaceId, isPrimaryAdmin: users.isPrimaryAdmin })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!owner) return { ok: true };

	const { workspace, usage } = await getWorkspaceWithUsage(env, owner);
	if (workspace.status === "suspended") {
		return { ok: false, error: "550 5.7.1 Recipient workspace is suspended" };
	}
	if (workspace.trialExpired) {
		return { ok: false, error: "550 5.7.1 Recipient workspace trial has ended" };
	}
	if (usage.storageUsedBytes + incomingBytes > workspace.planDetails.storageLimitBytes) {
		return { ok: false, error: "552 5.2.2 Recipient workspace storage quota exceeded" };
	}
	if (mailboxId && workspace.planDetails.storagePerMailboxBytes) {
		const mailboxUsed = await getMailboxStorageUsed(env, mailboxId);
		if (mailboxUsed + incomingBytes > workspace.planDetails.storagePerMailboxBytes) {
			return { ok: false, error: "552 5.2.2 Recipient mailbox storage quota exceeded (1 GB limit)" };
		}
	}
	return { ok: true };
}

export function isSameWorkspace(
	actor: { isPrimaryAdmin?: boolean; workspaceId?: string | null; id: string },
	target: { workspaceId?: string | null; id: string },
): boolean {
	if (actor.isPrimaryAdmin) return true;
	if (target.id === actor.id) return true;
	return !!actor.workspaceId && target.workspaceId === actor.workspaceId;
}

