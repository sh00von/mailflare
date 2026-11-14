import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ACCOUNTS_COOKIE, rememberLogin } from "@/lib/auth/accounts";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { recordAuthActivity } from "@/lib/auth/activity";
import type { AuthActivityAction } from "@/lib/auth/activity-types";

/**
 * The one place a verified sign-in turns into a session: cookie, Bearer token
 * for the client, account switcher entry, and audit log.
 */
export async function completeLogin(
	env: CloudflareEnv,
	request: Request,
	userId: string,
	options: { activity?: AuthActivityAction; body?: Record<string, unknown> } = {},
): Promise<NextResponse> {
	const token = await createSession(env, userId);
	await recordAuthActivity(env, { action: options.activity ?? "auth.login", userId, request });

	let redirectUrl = "/mail/inbox";
	try {
		const [userRow] = await getDb(env)
			.select({ role: users.role, isPrimaryAdmin: users.isPrimaryAdmin })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (userRow?.role === "admin" || userRow?.isPrimaryAdmin) {
			redirectUrl = "/admin/domains";
		}
	} catch {}

	const response = NextResponse.json({
		ok: true,
		token,
		redirect: redirectUrl,
		...options.body,
	});
	const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https://");
	let cookieDomain: string | undefined;
	const rawCookieDomain = process.env.COOKIE_DOMAIN?.trim();
	if (rawCookieDomain) {
		const cleanDomain = rawCookieDomain.replace(/^\./, "").toLowerCase();
		const reqHost = (
			request.headers.get("x-forwarded-host") ??
			request.headers.get("host") ??
			new URL(request.url).host
		).toLowerCase().split(":")[0];
		if (reqHost === cleanDomain || reqHost.endsWith(`.${cleanDomain}`)) {
			cookieDomain = rawCookieDomain.startsWith(".") ? rawCookieDomain : `.${rawCookieDomain}`;
		}
	}
	response.headers.set("Cache-Control", "no-store");
	response.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: isHttps,
		sameSite: "lax",
		path: "/",
		...(cookieDomain ? { domain: cookieDomain } : {}),
		maxAge: 60 * 60 * 24 * 30,
	});
	const accountsJar = await cookies();
	await rememberLogin(env, response, accountsJar.get(ACCOUNTS_COOKIE)?.value, token, accountsJar.get(SESSION_COOKIE)?.value, request);
	return response;
}
