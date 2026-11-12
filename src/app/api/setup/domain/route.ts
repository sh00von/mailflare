import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { preflightDomain } from "@/lib/domains/preflight";
import { setupDomainSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";

export async function POST(request: Request) {
	const env = getEnv();

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
		return NextResponse.json({ error: "This domain is already registered. Only the workspace owner can create team accounts for it." }, { status: 409 });
	}

	try {
		return NextResponse.json({ domain: await preflightDomain(env, normalized) });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Domain check failed";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
