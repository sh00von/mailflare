import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { routingRules } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxSettingsAccess } from "@/lib/mailboxes/settings-access";

type RouteParams = {
	params: Promise<{ id: string; ruleId: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
	const { id, ruleId } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	await db
		.delete(routingRules)
		.where(
			and(
				eq(routingRules.id, ruleId),
				eq(routingRules.mailboxId, id),
				eq(routingRules.scope, "mailbox"),
			),
		);

	return NextResponse.json({ success: true });
}
