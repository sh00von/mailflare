import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { parseTimeZoneUpdate } from "./utils";

export async function PATCH(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	if (!hasValidSessionMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	const input = await parseTimeZoneUpdate(request);
	if (!input) return NextResponse.json({ error: "Choose a valid timezone" }, { status: 400 });
	const db = getDb(env);
	await db.update(users).set({ timeZone: input.timeZone }).where(eq(users.id, user.id));
	return NextResponse.json({ timeZone: input.timeZone });
}
