import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { domains, mailboxes, users, workspaces } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { hasAdminAccount } from "@/lib/auth/setup";
import { completeLogin } from "@/lib/auth/login-response";
import { newId } from "@/lib/ids";
import { firstRunRegisterSchema } from "@/lib/validators";
import { isDisposableEmail } from "@/lib/auth/disposable-emails";
import { verifyRegistrationCode } from "@/lib/auth/email-verification";
import { addDomainForUser } from "@/lib/domains/service";
import { rollbackDomainProvisioning } from "@/lib/domains/rollback";
import type { DomainProvisioningChanges } from "@/lib/domains/types";
import { ensureEmailRoutingRuleToWorker } from "@/lib/cloudflare-api";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { getDomainProvisioningError } from "@/lib/domains/errors";
import { auditDomainDns } from "@/lib/domains/dns-audit";
import { checkDomainOwnershipDns } from "@/lib/domains/ownership";
import { resolvePlanId } from "@/lib/plans/catalog";
import { createWorkspaceForOwner } from "@/lib/plans/usage";
import { isStripeConfigured, createStripeCustomer, createStripeCheckoutSession } from "@/lib/billing/stripe";

export async function POST(request: Request) {
	const env = getEnv();
	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json({ error: "Too many registration attempts. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
	}
	const db = getDb(env);
	const isFirstUser = !(await hasAdminAccount(env));

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid registration request" }, { status });
	}
	const firstRunParsed = firstRunRegisterSchema.safeParse(body);
	if (!firstRunParsed.success) {
		return NextResponse.json({ error: firstRunParsed.error.flatten() }, { status: 400 });
	}
	const reqBody = body as Record<string, unknown>;
	if (!verifyCaptcha(reqBody.captchaAnswer, reqBody.captchaToken)) {
		return NextResponse.json({ error: "Invalid security code. Please try again." }, { status: 400 });
	}

	if (firstRunParsed.data.resetEmail && isDisposableEmail(firstRunParsed.data.resetEmail)) {
		return NextResponse.json({ error: "Please provide a permanent, non-disposable email address for account recovery." }, { status: 400 });
	}

	if (!firstRunParsed.data.verificationCode) {
		return NextResponse.json(
			{ error: "Please enter the 6-digit verification code sent to your email." },
			{ status: 400 },
		);
	}

	const codeCheck = await verifyRegistrationCode(
		env,
		firstRunParsed.data.resetEmail,
		firstRunParsed.data.verificationCode,
	);
	if (!codeCheck.ok) {
		return NextResponse.json({ error: codeCheck.error }, { status: 400 });
	}

	const domainName = firstRunParsed.data.domain.toLowerCase().trim();
	const username = firstRunParsed.data.username.toLowerCase().trim();
	const email = `${username}@${domainName}`;
	const password = firstRunParsed.data.password;
	const name = username;

	const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing) {
		return NextResponse.json({ error: "Email already registered" }, { status: 409 });
	}
	const [existingDomain] = await db.select({ id: domains.id }).from(domains).where(eq(domains.hostname, domainName)).limit(1);
	if (existingDomain) {
		return NextResponse.json({ error: "This domain is already in use. Ask the person who set it up to add you." }, { status: 409 });
	}

	const selectedPlan = resolvePlanId((body as Record<string, unknown>)?.plan);
	const rawOrgName = typeof (body as Record<string, unknown>)?.orgName === "string"
		? ((body as Record<string, unknown>).orgName as string).trim()
		: "";
	const userId = newId("usr");
	const workspaceId = await createWorkspaceForOwner(env, {
		ownerUserId: userId,
		name: rawOrgName || `${name || username}'s Workspace`,
		plan: selectedPlan,
		status: "trialing",
	});
	await db.insert(users).values({
		id: userId,
		// Opening a message must not tell the sender; the column default predates this and stays "allow".
		remoteContentMode: "ask",
		email,
		resetEmail: firstRunParsed.data.resetEmail,
		passwordHash: hashPassword(password!),
		name,
		role: "admin",
		isPrimaryAdmin: isFirstUser,
		canManageDomains: true,
		canManageUsers: true,
		canManageMailboxes: true,
		workspaceId,
	});

	// Tracks what the attempt changed on the Cloudflare zone so a failure can undo
	// precisely that. The DB is not a reliable source for this: the same errors that
	// abort registration (an unmigrated schema, a dead D1 binding) also stop the
	// domain row from ever being written, which is exactly when the orphaned zone
	// config would go unnoticed.
	let changes: DomainProvisioningChanges | null = null;
	try {
		const added = await addDomainForUser(env, userId, domainName, {
			enableRouting: true,
			enableSending: firstRunParsed.data.enableSending ?? true,
			replaceMxRecords: firstRunParsed.data.replaceMxRecords,
			skipDns: firstRunParsed.data.skipDns,
		});
		const domain = added.domain;
		changes = added.changes;
		await db.update(domains).set({ workspaceId }).where(eq(domains.id, domain.id));
		if (domain.zoneId !== "manual" && domain.zoneId !== "self-hosted") {
			await ensureEmailRoutingRuleToWorker(env, domain.zoneId, email);
			changes.createdAddressRules.push(email);
		}
		const mailboxId = newId("mbx");
		await db.insert(mailboxes).values({
			id: mailboxId,
			userId,
			domainId: domain.id,
			localPart: username,
			displayName: username,
		});
		await ensureMailboxDomainRouting(env, db, { id: mailboxId, domainId: domain.id, localPart: username, useAllDomains: true });
	} catch (err) {
		if (changes) await rollbackDomainProvisioning(env, changes);
		try {
			// The domain row cascades with the user.
			await db.delete(users).where(eq(users.id, userId));
			await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
		} catch (cleanupError) {
			console.warn("Failed to remove the partial user after registration failure", cleanupError);
		}
		const failure = getDomainProvisioningError(err, "Domain setup failed", 502);
		return NextResponse.json(
			{ error: failure.message, code: failure.code },
			{ status: failure.status },
		);
	}

	if (isStripeConfigured(env)) {
		try {
			const customerId = await createStripeCustomer(env, {
				email,
				name,
				workspaceId,
			});
			await db.update(workspaces).set({ stripeCustomerId: customerId }).where(eq(workspaces.id, workspaceId));
		} catch (err) {
			console.error("Failed to initialize Stripe customer on registration:", err);
		}
	}

	return await completeLogin(env, request, userId, {
		activity: "auth.login",
		body: { redirect: "/inbox" },
	});
}
