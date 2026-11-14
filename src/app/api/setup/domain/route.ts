import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { setupDomainSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";

export async function POST(request: Request) {
	const env = getEnv();
	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json({ error: "Too many domain checks. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
	}

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid setup request" }, { status });
	}
	const parsed = setupDomainSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const normalized = parsed.data.hostname.toLowerCase().trim();
	const [existing] = await getDb(env).select({ id: domains.id }).from(domains).where(eq(domains.hostname, normalized)).limit(1);
	if (existing) {
		return NextResponse.json({ error: "This domain is already in use. Ask the person who set it up to add you." }, { status: 409 });
	}

	return NextResponse.json({
		domain: {
			hostname: normalized,
			zone: { id: "self-hosted", name: normalized },
		},
	});
}
