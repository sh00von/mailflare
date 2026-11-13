import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const db = getDb(getEnv());
		// SELECT 1 verification probe
		await db.select({ id: workspaces.id }).from(workspaces).limit(1);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[health] Database check failed:", error);
		return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
	}
}
