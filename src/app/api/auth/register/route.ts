import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { domains, mailboxes, users } from "@/db/schema";
import { hashPassword, PASSWORDLESS_PASSWORD_HASH } from "@/lib/auth/password";
import { hasAdminAccount } from "@/lib/auth/setup";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { createEnrollmentGrant, SETUP_COOKIE } from "@/lib/auth/webauthn/grants";
import { newId } from "@/lib/ids";
import { firstRunRegisterSchema } from "@/lib/validators";
import { addDomainForUser } from "@/lib/domains/service";
import { rollbackDomainProvisioning } from "@/lib/domains/rollback";
import type { DomainProvisioningChanges } from "@/lib/domains/types";
import { ensureEmailRoutingRuleToWorker } from "@/lib/cloudflare-api";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { getDomainProvisioningError } from "@/lib/domains/errors";
import { auditDomainDns } from "@/lib/domains/dns-audit";
import { resolvePlanId } from "@/lib/plans/catalog";
import { createWorkspaceForOwner } from "@/lib/plans/usage";

export async function POST(request: Request) {
	const env = getEnv();
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
	if (!(await verifyTurnstileToken(env, request, (body as Record<string, unknown>).turnstileToken))) {
		return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
	}

	const domainName = firstRunParsed.data.domain.toLowerCase().trim();
	const username = firstRunParsed.data.username.toLowerCase().trim();
	const email = `${username}@${domainName}`;
	const password = firstRunParsed.data.password;
	const usePasskey = !!firstRunParsed.data.usePasskey;
	const name = username;

	const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing) {
		return NextResponse.json({ error: "Email already registered" }, { status: 409 });
	}
	const [existingDomain] = await db.select({ id: domains.id }).from(domains).where(eq(domains.hostname, domainName)).limit(1);
	if (existingDomain) {
		return NextResponse.json({ error: "This domain is already registered. Only the workspace owner can create team accounts for it." }, { status: 409 });
	}

	const dnsAudit = await auditDomainDns(domainName, { routing: { records: [], missing: [] }, sending: [] });
	if (dnsAudit.mx.status !== "ok" || dnsAudit.spf.status !== "ok" || dnsAudit.dmarc.status !== "ok") {
		return NextResponse.json(
			{ error: "Domain DNS is not verified yet. Add your MX, SPF, and DMARC records and check DNS again before creating your account." },
			{ status: 400 },
		);
	}

	const selectedPlan = resolvePlanId((body as Record<string, unknown>)?.plan);
	const userId = newId("usr");
	const workspaceId = await createWorkspaceForOwner(env, {
		ownerUserId: userId,
		name: `${name}'s Workspace`,
		plan: selectedPlan,
		status: isFirstUser ? "active" : "trialing",
	});
	await db.insert(users).values({
		id: userId,
		// Opening a message must not tell the sender; the column default predates this and stays "allow".
		remoteContentMode: "ask",
		email,
		resetEmail: firstRunParsed.data.resetEmail,
		passwordHash: usePasskey ? PASSWORDLESS_PASSWORD_HASH : hashPassword(password!),
		name,
		role: "admin",
		isPrimaryAdmin: isFirstUser,
		canManageDomains: true,
		canManageUsers: true,
		canManageMailboxes: true,
		workspaceId,
	});

	// Create the setup grant before touching DNS. If it cannot be written, the
	// account has no usable sign-in method and registration is already closed,
	// so remove it rather than leaving an unreachable administrator behind.
	let setupToken: string | null = null;
	if (usePasskey) {
		try {
			setupToken = await createEnrollmentGrant(env, { userId, kind: "setup" });
		} catch (error) {
			console.error("Could not create the first-run passkey setup grant", error);
			await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
			return NextResponse.json({ error: "Could not start passkey setup. Try again.", code: "passkey_unavailable" }, { status: 500 });
		}
	}

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
		if (domain.zoneId !== "manual") {
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
		} catch (cleanupError) {
			console.warn("Failed to remove the partial user after registration failure", cleanupError);
		}
		const failure = getDomainProvisioningError(err, "Domain setup failed", 502);
		return NextResponse.json(
			{ error: failure.message, code: failure.code },
			{ status: failure.status },
		);
	}

	const adminAppUrl = process.env.ADMIN_APP_URL?.trim().replace(/\/+$/, "") || process.env.MAIL_APP_URL?.trim().replace(/\/+$/, "") || "";
	const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;
	const sessionToken = setupToken ? null : await createSession(env, userId);
	const response = NextResponse.json({
		ok: true,
		redirect: setupToken ? "/setup/passkey" : `${adminAppUrl}/domains`,
		...(setupToken ? { requiresPasskeySetup: true } : {}),
	});
	response.headers.set("Cache-Control", "no-store");
	const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https://");
	if (setupToken) {
		response.cookies.set(SETUP_COOKIE, setupToken, {
			httpOnly: true,
			secure: isHttps,
			sameSite: "lax",
			path: "/",
			...(cookieDomain ? { domain: cookieDomain } : {}),
			maxAge: 24 * 60 * 60,
		});
	}
	if (sessionToken) {
		response.cookies.set(SESSION_COOKIE, sessionToken, {
			httpOnly: true,
			secure: isHttps,
			sameSite: "lax",
			path: "/",
			...(cookieDomain ? { domain: cookieDomain } : {}),
			maxAge: 30 * 24 * 60 * 60,
		});
	} else {
		response.cookies.set(SESSION_COOKIE, "", {
			httpOnly: true,
			secure: isHttps,
			sameSite: "lax",
			path: "/",
			...(cookieDomain ? { domain: cookieDomain } : {}),
			maxAge: 0,
		});
	}
	return response;
}
