import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mailboxes } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxSettingsAccess } from "@/lib/mailboxes/settings-access";
import { getMailboxVacationConfig, setMailboxVacationConfig } from "@/lib/email/vacation";
import { checkWorkspaceActive, getWorkspaceWithUsage } from "@/lib/plans/usage";
import { z } from "zod";
import type { MailboxRouteParams } from "../types";

const vacationUpdateSchema = z.object({
	enabled: z.boolean(),
	startDate: z.string().nullable().optional(),
	endDate: z.string().nullable().optional(),
	subject: z.string().max(200).default("Out of Office"),
	messageHtml: z.string().max(10000).default(""),
});

export async function GET(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const { workspace } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return NextResponse.json({ error: inactive }, { status: 403 });

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canRead) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const config = await getMailboxVacationConfig(env, id);
	return NextResponse.json({ vacation: config });
}

export async function PUT(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const { workspace } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return NextResponse.json({ error: inactive }, { status: 403 });

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const parsed = vacationUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
	}

	const db = getDb(env);
	const [mailbox] = await db
		.select({ id: mailboxes.id, userId: mailboxes.userId, domainId: mailboxes.domainId })
		.from(mailboxes)
		.where(eq(mailboxes.id, id))
		.limit(1);

	if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	await setMailboxVacationConfig(env, mailbox.userId, mailbox.domainId, mailbox.id, {
		enabled: parsed.data.enabled,
		startDate: parsed.data.startDate ?? null,
		endDate: parsed.data.endDate ?? null,
		subject: parsed.data.subject || "Out of Office",
		messageHtml: parsed.data.messageHtml || "",
	});

	return NextResponse.json({ success: true });
}
