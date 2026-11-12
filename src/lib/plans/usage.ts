import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, messageAttachments, messages, users, workspaces } from "@/db/schema";
import { newId } from "@/lib/ids";
import { getPlanDefinition, resolvePlanId, TRIAL_DAYS, type PlanDefinition, type PlanId, type WorkspaceStatus } from "./catalog";

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
};

export type WorkspaceUsage = {
	domainsUsed: number;
	mailboxesUsed: number;
	storageUsedBytes: number;
	dailySentCount: number;
};

export type WorkspaceWithUsage = {
	workspace: WorkspaceSummary;
	usage: WorkspaceUsage;
};

function toSummary(row: typeof workspaces.$inferSelect): WorkspaceSummary {
	const plan = resolvePlanId(row.plan);
	const now = Date.now();
	const trialEndsMs = row.trialEndsAt ? row.trialEndsAt.getTime() : null;
	const trialExpired = row.status === "trialing" && trialEndsMs !== null && trialEndsMs < now;
	const daysLeftInTrial =
		row.status === "trialing" && trialEndsMs !== null
			? Math.max(0, Math.ceil((trialEndsMs - now) / (24 * 60 * 60 * 1000)))
			: null;

	return {
		id: row.id,
		name: row.name,
		ownerUserId: row.ownerUserId,
		plan,
		planDetails: getPlanDefinition(plan),
		status: row.status as WorkspaceStatus,
		trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
		trialExpired,
		daysLeftInTrial,
	};
}

export async function createWorkspaceForOwner(
	env: CloudflareEnv,
	input: { ownerUserId: string; name: string; plan: PlanId; status?: WorkspaceStatus },
) {
	const db = getDb(env);
	const id = newId("ws");
	const status: WorkspaceStatus = input.status ?? "trialing";
	const trialEndsAt = status === "trialing" ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;
	await db.insert(workspaces).values({
		id,
		name: input.name,
		ownerUserId: input.ownerUserId,
		plan: input.plan,
		status,
		trialEndsAt,
	});
	return id;
}

export async function getOrEnsureWorkspaceForUser(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
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

	// Backfill a workspace for pre-existing accounts.
	const plan: PlanId = user.isPrimaryAdmin ? "business" : "starter";
	const status: WorkspaceStatus = user.isPrimaryAdmin ? "active" : "trialing";
	const newWorkspaceId = await createWorkspaceForOwner(env, {
		ownerUserId: user.id,
		name: `${user.name}'s Workspace`,
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
		return { domainsUsed: domainIds.length, mailboxesUsed: 0, storageUsedBytes: 0, dailySentCount: 0 };
	}

	const startOfUtcDay = new Date();
	startOfUtcDay.setUTCHours(0, 0, 0, 0);

	const [[msgStats], [attStats], [sentStats]] = await Promise.all([
		db
			.select({ total: sql<number>`coalesce(sum(${messages.size}), 0)` })
			.from(messages)
			.where(inArray(messages.mailboxId, mailboxIds)),
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
					gte(messages.createdAt, startOfUtcDay),
				),
			),
	]);

	return {
		domainsUsed: domainIds.length,
		mailboxesUsed: mailboxIds.length,
		storageUsedBytes: Number(msgStats?.total ?? 0) + Number(attStats?.total ?? 0),
		dailySentCount: Number(sentStats?.total ?? 0),
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
		return `Your ${workspace.planDetails.name} 14-day trial has ended. Upgrade or activate your plan in Plan & Usage.`;
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
	if (usage.domainsUsed >= workspace.planDetails.maxDomains) {
		return {
			ok: false,
			error: `${workspace.planDetails.name} plan allows up to ${workspace.planDetails.maxDomains} domain(s). Upgrade your plan to add more domains.`,
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
	if (usage.mailboxesUsed >= workspace.planDetails.maxMailboxes) {
		return {
			ok: false,
			error: `${workspace.planDetails.name} plan allows up to ${workspace.planDetails.maxMailboxes} mailbox(es). Upgrade your plan to add more team members.`,
		};
	}
	return { ok: true, workspace };
}

export async function checkCanSendEmail(
	env: CloudflareEnv,
	user: { id: string; name: string; workspaceId?: string | null; isPrimaryAdmin?: boolean; createdByUserId?: string | null },
	attachmentBytes = 0,
): Promise<{ ok: true; workspace: WorkspaceSummary } | { ok: false; error: string }> {
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return { ok: false, error: inactive };
	if (usage.dailySentCount >= workspace.planDetails.dailySendLimit) {
		return {
			ok: false,
			error: `Daily sending limit reached (${workspace.planDetails.dailySendLimit} emails/day on ${workspace.planDetails.name}). Upgrade your plan for higher daily limits.`,
		};
	}
	if (usage.storageUsedBytes >= workspace.planDetails.storageLimitBytes) {
		return {
			ok: false,
			error: `Workspace storage limit reached (${workspace.planDetails.storageLabel} on ${workspace.planDetails.name}). Delete old emails or upgrade your plan to send.`,
		};
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

