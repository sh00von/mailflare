import { NextResponse } from "next/server";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getEnv } from "@/lib/cloudflare";
import { getPrimaryDomain } from "@/lib/user";

export async function GET() {
	const env = getEnv();
	try {
		const [adminAccountExists, domain] = await Promise.all([
			hasAdminAccount(env),
			getPrimaryDomain(env),
		]);
		return NextResponse.json({
			hasAdminAccount: adminAccountExists,
			hasPrimaryDomain: !!domain,
		}, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("setup status failed", error);
		return NextResponse.json({ error: "Could not load setup status" }, { status: 500 });
	}
}
