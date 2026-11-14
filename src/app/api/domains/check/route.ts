import { NextResponse } from "next/server";
import { canManageDomains } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { preflightDomain } from "@/lib/domains/preflight";
import { setupDomainSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	const parsed = setupDomainSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const hostname = parsed.data.hostname.toLowerCase().trim();
	return NextResponse.json({
		domain: {
			hostname,
			zone: { id: "self-hosted", name: hostname },
		},
	});
}
