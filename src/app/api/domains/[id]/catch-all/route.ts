import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes, routingRules } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { canManageDomains } from "@/lib/auth/admin";
import { newId } from "@/lib/ids";
import { z } from "zod";

const CATCH_ALL_RULE_NAME = "__catch_all__";

const catchAllSchema = z.object({
	enabled: z.boolean(),
	mailboxId: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	const [domain] = await db
		.select()
		.from(domains)
		.where(eq(domains.id, id))
		.limit(1);

	if (!domain || (domain.userId !== user.id && !user.isPrimaryAdmin)) {
		return NextResponse.json({ error: "Domain not found" }, { status: 404 });
	}

	const [rule] = await db
		.select()
		.from(routingRules)
		.where(
			and(
				eq(routingRules.domainId, id),
				eq(routingRules.scope, "domain"),
				eq(routingRules.name, CATCH_ALL_RULE_NAME),
			),
		)
		.limit(1);

	return NextResponse.json({
		catchAll: {
			enabled: rule ? rule.enabled : false,
			mailboxId: rule?.mailboxId ?? null,
		},
	});
}

export async function PUT(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const db = getDb(env);
	const [domain] = await db
		.select()
		.from(domains)
		.where(eq(domains.id, id))
		.limit(1);

	if (!domain || (domain.userId !== user.id && !user.isPrimaryAdmin)) {
		return NextResponse.json({ error: "Domain not found" }, { status: 404 });
	}

	const body = await request.json().catch(() => ({}));
	const parsed = catchAllSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const { enabled, mailboxId } = parsed.data;

	if (enabled && mailboxId) {
		const [targetMailbox] = await db
			.select({ id: mailboxes.id })
			.from(mailboxes)
			.where(and(eq(mailboxes.id, mailboxId), eq(mailboxes.domainId, domain.id)))
			.limit(1);

		if (!targetMailbox) {
			return NextResponse.json({ error: "Selected mailbox does not belong to this domain" }, { status: 400 });
		}
	}

	const [existing] = await db
		.select({ id: routingRules.id })
		.from(routingRules)
		.where(
			and(
				eq(routingRules.domainId, id),
				eq(routingRules.scope, "domain"),
				eq(routingRules.name, CATCH_ALL_RULE_NAME),
			),
		)
		.limit(1);

	if (existing) {
		await db
			.update(routingRules)
			.set({
				enabled: enabled && !!mailboxId,
				mailboxId: mailboxId ?? null,
			})
			.where(eq(routingRules.id, existing.id));
	} else if (enabled && mailboxId) {
		await db.insert(routingRules).values({
			id: newId("rule"),
			userId: domain.userId,
			domainId: domain.id,
			scope: "domain",
			name: CATCH_ALL_RULE_NAME,
			enabled: true,
			pattern: "*",
			matchField: "recipient",
			matchOperator: "contains",
			matchValue: "*",
			action: "store",
			mailboxId,
			priority: -99,
		});
	}

	return NextResponse.json({ success: true });
}
