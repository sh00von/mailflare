import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mailboxes, routingRules, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";
import { getMailboxSettingsAccess } from "@/lib/mailboxes/settings-access";
import { checkWorkspaceActive, getWorkspaceWithUsage } from "@/lib/plans/usage";
import { z } from "zod";
import type { MailboxRouteParams } from "../types";

const updateMailboxForwardingSchema = z.object({
	enabled: z.boolean(),
	forwardTo: z.string().trim().email().optional().or(z.literal("")),
	keepCopy: z.boolean().default(true),
});

export async function GET(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);
	const { workspace } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return NextResponse.json({ error: inactive }, { status: 403 });

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canRead) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const [mailbox] = await db
		.select({ id: mailboxes.id, userId: mailboxes.userId, domainId: mailboxes.domainId })
		.from(mailboxes)
		.where(eq(mailboxes.id, id))
		.limit(1);
	if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const [rule] = await db
		.select()
		.from(routingRules)
		.where(
			and(
				eq(routingRules.mailboxId, id),
				eq(routingRules.scope, "mailbox"),
				eq(routingRules.action, "forward"),
			),
		)
		.limit(1);

	if (rule) {
		return NextResponse.json({
			forwarding: {
				enabled: rule.enabled,
				forwardTo: rule.forwardTo ?? "",
				keepCopy: rule.keepCopy,
			},
		});
	}

	const [userRow] = await db
		.select({ forwardingEmail: users.forwardingEmail })
		.from(users)
		.where(eq(users.id, mailbox.userId))
		.limit(1);

	if (userRow?.forwardingEmail) {
		return NextResponse.json({
			forwarding: {
				enabled: true,
				forwardTo: userRow.forwardingEmail,
				keepCopy: true,
			},
		});
	}

	return NextResponse.json({
		forwarding: {
			enabled: false,
			forwardTo: "",
			keepCopy: true,
		},
	});
}

export async function PUT(request: Request, { params }: MailboxRouteParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);
	const { workspace } = await getWorkspaceWithUsage(env, user);
	const inactive = checkWorkspaceActive(workspace);
	if (inactive) return NextResponse.json({ error: inactive }, { status: 403 });

	const access = await getMailboxSettingsAccess(env, user, id);
	if (!access?.canManage) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

	const [mailbox] = await db
		.select({ id: mailboxes.id, userId: mailboxes.userId, domainId: mailboxes.domainId, localPart: mailboxes.localPart })
		.from(mailboxes)
		.where(eq(mailboxes.id, id))
		.limit(1);
	if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const parsed = updateMailboxForwardingSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid forwarding settings. Please provide a valid email." }, { status: 400 });
	}

	const { enabled, keepCopy } = parsed.data;
	const forwardTo = parsed.data.forwardTo ? parsed.data.forwardTo.trim() : "";

	if (enabled && !forwardTo) {
		return NextResponse.json({ error: "Please enter a valid forwarding email address" }, { status: 400 });
	}

	const [existingRule] = await db
		.select({ id: routingRules.id })
		.from(routingRules)
		.where(
			and(
				eq(routingRules.mailboxId, id),
				eq(routingRules.scope, "mailbox"),
				eq(routingRules.action, "forward"),
			),
		)
		.limit(1);

	if (existingRule) {
		await db
			.update(routingRules)
			.set({
				enabled,
				forwardTo: enabled ? forwardTo : null,
				keepCopy,
			})
			.where(eq(routingRules.id, existingRule.id));
	} else if (enabled) {
		await db.insert(routingRules).values({
			id: newId("rl"),
			userId: mailbox.userId,
			domainId: mailbox.domainId,
			scope: "mailbox",
			name: `Forward ${mailbox.localPart}`,
			enabled: true,
			pattern: "*",
			matchField: "email",
			matchOperator: "contains",
			matchValue: "*",
			action: "forward",
			mailboxId: id,
			forwardTo,
			keepCopy,
			priority: 100,
		});
	}

	// Synchronize with user profile forwarding if appropriate
	await db
		.update(users)
		.set({
			forwardingEmail: enabled ? forwardTo : null,
		})
		.where(eq(users.id, mailbox.userId));

	return NextResponse.json({
		forwarding: {
			enabled,
			forwardTo,
			keepCopy,
		},
	});
}
