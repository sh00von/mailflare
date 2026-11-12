import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users, workspaces } from "@/db/schema";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/cookies";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { getPlanDefinition, resolvePlanId, TRIAL_DAYS } from "@/lib/plans/catalog";
import { getWorkspaceUsage } from "@/lib/plans/usage";

const updateSchema = z.object({
	id: z.string().min(1),
	plan: z.enum(["starter", "pro", "business"]).optional(),
	status: z.enum(["trialing", "active", "suspended"]).optional(),
	extendTrialDays: z.number().int().min(1).max(365).optional(),
});

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!isPrimaryAdmin(user)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const db = getDb(env);
	const rows = await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
	const owners = await db.select({ id: users.id, email: users.email, name: users.name }).from(users);
	const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));

	const items = await Promise.all(
		rows.map(async (row) => {
			const plan = resolvePlanId(row.plan);
			const usage = await getWorkspaceUsage(env, row.id);
			const owner = row.ownerUserId ? ownerMap.get(row.ownerUserId) ?? null : null;
			return {
				id: row.id,
				name: row.name,
				ownerEmail: owner?.email ?? null,
				ownerName: owner?.name ?? null,
				plan,
				planDetails: getPlanDefinition(plan),
				status: row.status,
				trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
				createdAt: row.createdAt.toISOString(),
				usage,
			};
		}),
	);

	return NextResponse.json({ workspaces: items });
}

export async function PATCH(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!isPrimaryAdmin(user)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	if (!hasValidSessionMutationOrigin(request)) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}

	const parsed = updateSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid workspace update" }, { status: 400 });
	}

	const db = getDb(env);
	const [existing] = await db.select().from(workspaces).where(eq(workspaces.id, parsed.data.id)).limit(1);
	if (!existing) {
		return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
	}

	const updates: Partial<typeof workspaces.$inferInsert> = { updatedAt: new Date() };
	if (parsed.data.plan) updates.plan = parsed.data.plan;
	if (parsed.data.status) {
		updates.status = parsed.data.status;
		if (parsed.data.status === "trialing" && !existing.trialEndsAt && !parsed.data.extendTrialDays) {
			updates.trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
		}
	}
	if (parsed.data.extendTrialDays) {
		const base = existing.trialEndsAt && existing.trialEndsAt.getTime() > Date.now()
			? existing.trialEndsAt.getTime()
			: Date.now();
		updates.trialEndsAt = new Date(base + parsed.data.extendTrialDays * 24 * 60 * 60 * 1000);
		if (!parsed.data.status) updates.status = "trialing";
	}

	await db.update(workspaces).set(updates).where(eq(workspaces.id, parsed.data.id));
	return NextResponse.json({ ok: true });
}

