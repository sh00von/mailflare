import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { canManageDomains } from "@/lib/auth/admin";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getDomainForUser } from "@/lib/domains/service";

type Params = { params: Promise<{ id: string }> };

/** Sets the receiving provider for this domain (our built-in system). */
export async function PUT(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	if (!hasValidSessionMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
	const parsed = z.object({ provider: z.enum(["none", "postfix"]) }).safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: "Unknown receiving provider" }, { status: 400 });
	await getDb(env).update(domains).set({ receivingProvider: parsed.data.provider }).where(eq(domains.id, domain.id));
	return NextResponse.json({ domain: await getDomainForUser(env, user.id, id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ postfix: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
	return NextResponse.json({ ok: true });
}
