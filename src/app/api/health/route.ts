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
		const message = error instanceof Error ? error.message : "Database unavailable";
		return NextResponse.json({ ok: false, error: message }, { status: 503 });
	}
}

