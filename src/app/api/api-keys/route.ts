import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { API_KEY_SCOPES } from "@/lib/api/scopes";
import { generateApiKey, scopesToJson } from "@/lib/api-keys";
import { newId } from "@/lib/ids";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";

const createKeySchema = z.object({
	name: z.string().trim().min(1).max(100),
	scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
	mailboxIds: z.array(z.string().min(1)).max(30),
});

export async function GET(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	const user = auth.user;
	const db = getDb(env);
	const rows = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			prefix: apiKeys.prefix,
			kind: apiKeys.kind,
			mailboxScopeEnabled: apiKeys.mailboxScopeEnabled,
			scopes: apiKeys.scopes,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, user.id));

	return NextResponse.json({
		apiKeys: rows
			.filter((row) => row.kind !== "device")
			.map((row) => ({
				...row,
				mailboxIds: [],
			})),
	});
}

export async function POST(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	const user = auth.user;
	if (!hasValidSessionMutationOrigin(request)) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}

	const parsed = createKeySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const { fullKey, prefix, hash, sha256 } = await generateApiKey();
	const db = getDb(env);
	const mailboxIds = [...new Set(parsed.data.mailboxIds)];

	if (!mailboxIds.length) {
		return NextResponse.json({ error: "Choose a mailbox for mail permissions" }, { status: 400 });
	}

	for (const mailboxId of mailboxIds) {
		const access = await getMailboxAccessLevel(db, user, mailboxId);
		if (!access?.canRead) {
			return NextResponse.json({ error: "Mailbox not found or permission denied" }, { status: 403 });
		}
	}

	const id = newId("key");
	await db.insert(apiKeys).values({
		id,
		userId: user.id,
		name: parsed.data.name,
		prefix,
		keyHash: hash,
		keySha256: sha256,
		scopes: scopesToJson([...new Set(parsed.data.scopes)]),
		mailboxScopeEnabled: true,
	});

	return NextResponse.json({ id, name: parsed.data.name, prefix, key: fullKey, mailboxIds });
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	const user = auth.user;
	if (!hasValidSessionMutationOrigin(request)) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}

	const id = new URL(request.url).searchParams.get("id");
	if (!id) return NextResponse.json({ error: "Key required" }, { status: 400 });

	const db = getDb(env);
	const [key] = await db
		.select({ id: apiKeys.id })
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
		.limit(1);

	if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

	await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
	return NextResponse.json({ ok: true });
}
