import { NextResponse, type NextRequest } from "next/server";

// Legacy root paths redirecting to clean canonical URLs
const LEGACY_REDIRECTS: Record<string, string> = {
	"/dash": "/admin",
	"/dash/": "/admin",
	"/dash/domains": "/admin/domains",
	"/dash/accounts": "/admin/mailboxes",
	"/dash/plan": "/admin/plan",
	"/dash/workspaces": "/admin/workspaces",
	"/dash/spam-filter": "/admin/spam-filter",
	"/dash/backups": "/admin/backups",
	"/dash/audit-logs": "/admin/audit-logs",
	"/dash/activity": "/admin/activity",
	"/dash/general": "/admin/general",
	"/domains": "/admin/domains",
	"/accounts": "/admin/mailboxes",
	"/plan": "/admin/plan",
	"/workspaces": "/admin/workspaces",
	"/spam-filter": "/admin/spam-filter",
	"/backups": "/admin/backups",
	"/audit-logs": "/admin/audit-logs",
	"/activity": "/admin/activity",
	"/general": "/admin/general",
	"/inbox": "/mail/inbox",
	"/sent": "/mail/sent",
	"/drafts": "/mail/drafts",
	"/trash": "/mail/trash",
	"/spam": "/mail/spam",
	"/starred": "/mail/starred",
	"/archived": "/mail/archived",
	"/scheduled": "/mail/scheduled",
	"/snoozed": "/mail/snoozed",
	"/settings": "/mail/settings",
};

export function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const host = (
		request.headers.get("x-forwarded-host") ??
		request.headers.get("host") ??
		request.nextUrl.host
	).toLowerCase();

	const appBase = process.env.APP_URL?.trim().replace(/\/+$/, "");
	const appHost = appBase ? new URL(appBase).host.toLowerCase() : "";

	// 1. Customer Branded Webmail CNAME (e.g. mail.company.com)
	const isCustomerCname =
		appHost &&
		host !== appHost &&
		!host.endsWith(`.${appHost}`) &&
		(host.startsWith("mail.") || host.startsWith("webmail."));

	if (isCustomerCname && pathname === "/") {
		return NextResponse.rewrite(new URL(`/inbox${search}`, request.url));
	}

	// 2. Legacy Direct Redirects (Canonical namespace enforcement)
	if (LEGACY_REDIRECTS[pathname]) {
		return NextResponse.redirect(new URL(`${LEGACY_REDIRECTS[pathname]}${search}`, request.url), 308);
	}

	// Dynamic prefix redirects
	if (pathname.startsWith("/dash/")) {
		const remainder = pathname.slice("/dash/".length);
		const target = remainder === "accounts" ? "mailboxes" : remainder;
		return NextResponse.redirect(new URL(`/admin/${target}${search}`, request.url), 308);
	}
	if (pathname.startsWith("/accounts/")) {
		const remainder = pathname.slice("/accounts/".length);
		return NextResponse.redirect(new URL(`/admin/mailboxes/${remainder}${search}`, request.url), 308);
	}
	if (pathname.startsWith("/folders/")) {
		const remainder = pathname.slice("/folders/".length);
		return NextResponse.redirect(new URL(`/mail/folders/${remainder}${search}`, request.url), 308);
	}
	if (pathname.startsWith("/settings/")) {
		const remainder = pathname.slice("/settings/".length);
		return NextResponse.redirect(new URL(`/mail/settings/${remainder}${search}`, request.url), 308);
	}

	// Native rewrites for /admin/* and /mail/* are handled cleanly by next.config.ts rewrites()
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|\\.well-known/|favicon\\.ico|manifest\\.webmanifest).*)",
	],
};
