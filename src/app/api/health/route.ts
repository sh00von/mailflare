import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const db = getDb(getEnv());
		await db.execute(sql`SELECT 1`);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[health] Database check failed:", error);
		return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
	}
}
