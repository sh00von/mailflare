import { and, desc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { folders, mailboxes, routingRules } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";
import { getMailboxSettingsAccess } from "@/lib/mailboxes/settings-access";
import { z } from "zod";
import type { MailboxRouteParams } from "../types";

const createRuleSchema = z.object({
	name: z.string().trim().min(1).max(100),
	matchField: z.enum(["email", "content", "title", "sender", "recipient"]).default("sender"),
	matchOperator: z.enum(["contains", "exact", "starts_with", "ends_with"]).default("contains"),
	matchValue: z.string().trim().min(1).max(200),
	action: z.enum(["store", "spam", "trash"]).default("store"),
	folderId: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canRead) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const rules = await db
		.select({
			id: routingRules.id,
			name: routingRules.name,
			enabled: routingRules.enabled,
			matchField: routingRules.matchField,
			matchOperator: routingRules.matchOperator,
			matchValue: routingRules.matchValue,
			action: routingRules.action,
			folderId: routingRules.folderId,
			folderName: folders.name,
			createdAt: routingRules.createdAt,
		})
		.from(routingRules)
		.leftJoin(folders, eq(routingRules.folderId, folders.id))
		.where(
			and(
				eq(routingRules.mailboxId, id),
				eq(routingRules.scope, "mailbox"),
				ne(routingRules.name, "__vacation_responder__"),
			),
		)
		.orderBy(desc(routingRules.createdAt));

	return NextResponse.json({ rules });
}

export async function POST(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const [mailbox] = await db
		.select({ id: mailboxes.id, userId: mailboxes.userId, domainId: mailboxes.domainId })
		.from(mailboxes)
		.where(eq(mailboxes.id, id))
		.limit(1);

	if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const parsed = createRuleSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
	}

	const { name, matchField, matchOperator, matchValue, action, folderId } = parsed.data;

	if (action === "store" && folderId) {
		const [targetFolder] = await db
			.select({ id: folders.id })
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.mailboxId, id)))
			.limit(1);

		if (!targetFolder) {
			return NextResponse.json({ error: "Folder not found in this mailbox" }, { status: 400 });
		}
	}

	const ruleId = newId("rule");
	await db.insert(routingRules).values({
		id: ruleId,
		userId: mailbox.userId,
		domainId: mailbox.domainId,
		mailboxId: mailbox.id,
		scope: "mailbox",
		name,
		enabled: true,
		pattern: matchValue,
		matchField,
		matchOperator,
		matchValue,
		action,
		folderId: action === "store" ? (folderId ?? null) : null,
		priority: 10,
	});

	return NextResponse.json({ success: true, ruleId });
}
