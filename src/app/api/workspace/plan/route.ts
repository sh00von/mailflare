import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { PLAN_LIST } from "@/lib/plans/catalog";
import { getWorkspaceWithUsage } from "@/lib/plans/usage";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (user.role !== "admin" && !user.isPrimaryAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	const { workspace, usage } = await getWorkspaceWithUsage(env, user);
	return NextResponse.json({ workspace, usage, plans: PLAN_LIST });
}

