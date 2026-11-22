import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { users, workspaces } from "@/db/schema";
import { getSharedRedis } from "@/lib/redis/client";
import { config } from "@/lib/config";

export const PLAN_DAILY_LIMITS: Record<string, number> = {
	starter: config.plans.starter.dailySendLimit,
	pro: config.plans.pro.dailySendLimit,
	business: config.plans.business.dailySendLimit,
	free: config.plans.free.dailySendLimit,
};

export const DEFAULT_DAILY_LIMIT = config.plans.starter.dailySendLimit;

export interface QuotaCheckResult {
	allowed: boolean;
	current: number;
	limit: number;
	remaining: number;
	reason?: string;
}

const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

function getMidnightTtlSeconds(): number {
	const now = new Date();
	const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
	return Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function getDailyKey(targetId: string): string {
	const dateStr = new Date().toISOString().slice(0, 10);
	return `quota:daily_outbound:${targetId}:${dateStr}`;
}

export async function resolveDailyLimit(
	db: AppDatabase,
	target: { userId?: string; workspaceId?: string | null },
): Promise<{ targetId: string; limit: number }> {
	let targetId = target.workspaceId || target.userId || "default";
	let plan = "starter";

	if (target.workspaceId) {
		const [ws] = await db
			.select({ plan: workspaces.plan })
			.from(workspaces)
			.where(eq(workspaces.id, target.workspaceId))
			.limit(1);
		if (ws) plan = ws.plan;
	} else if (target.userId) {
		const [user] = await db
			.select({ workspaceId: users.workspaceId })
			.from(users)
			.where(eq(users.id, target.userId))
			.limit(1);

		if (user?.workspaceId) {
			targetId = user.workspaceId;
			const [ws] = await db
				.select({ plan: workspaces.plan })
				.from(workspaces)
				.where(eq(workspaces.id, user.workspaceId))
				.limit(1);
			if (ws) plan = ws.plan;
		}
	}

	const limit = PLAN_DAILY_LIMITS[plan] || DEFAULT_DAILY_LIMIT;
	return { targetId, limit };
}

/**
 * Pre-flight check: verifies whether adding `count` messages exceeds the daily tier limit.
 */
export async function checkDailyOutboundQuota(
	db: AppDatabase,
	env: CloudflareEnv,
	target: { userId?: string; workspaceId?: string | null },
	count = 1,
): Promise<QuotaCheckResult> {
	const { targetId, limit } = await resolveDailyLimit(db, target);
	const key = getDailyKey(targetId);
	const redis = getSharedRedis(env.REDIS_URL);

	let current = 0;
	if (redis) {
		try {
			const val = await redis.get(key);
			current = val ? parseInt(val, 10) : 0;
		} catch {
			current = 0;
		}
	} else {
		const mem = memoryCounters.get(key);
		if (mem && mem.expiresAt > Date.now()) {
			current = mem.count;
		} else {
			memoryCounters.delete(key);
		}
	}

	if (current + count > limit) {
		return {
			allowed: false,
			current,
			limit,
			remaining: Math.max(0, limit - current),
			reason: `Daily outbound quota exceeded (${current}/${limit} sent today on your tier). Resets at 00:00 UTC.`,
		};
	}

	return {
		allowed: true,
		current,
		limit,
		remaining: Math.max(0, limit - current - count),
	};
}

/**
 * Atomically increments the daily outbound counter after message dispatch.
 */
export async function incrementDailyOutboundQuota(
	db: AppDatabase,
	env: CloudflareEnv,
	target: { userId?: string; workspaceId?: string | null },
	count = 1,
): Promise<number> {
	const { targetId } = await resolveDailyLimit(db, target);
	const key = getDailyKey(targetId);
	const ttl = getMidnightTtlSeconds();
	const redis = getSharedRedis(env.REDIS_URL);

	if (redis) {
		try {
			const newCount = await redis.incrby(key, count);
			await redis.expire(key, ttl);
			return newCount;
		} catch (err) {
			console.warn("Failed to increment Redis daily quota:", err);
		}
	}

	// Memory fallback
	const mem = memoryCounters.get(key);
	const nextVal = (mem && mem.expiresAt > Date.now() ? mem.count : 0) + count;
	memoryCounters.set(key, { count: nextVal, expiresAt: Date.now() + ttl * 1000 });
	return nextVal;
}
