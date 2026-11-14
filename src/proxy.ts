import { NextResponse, type NextRequest } from "next/server";

// Clean /admin/* route mappings to internal (admin) pages
const ADMIN_REWRITES: Record<string, string> = {
	"/admin": "/domains",
	"/admin/": "/domains",
	"/admin/domains": "/domains",
	"/admin/mailboxes": "/accounts",
	"/admin/plan": "/plan",
	"/admin/workspaces": "/workspaces",
	"/admin/spam-filter": "/spam-filter",
	"/admin/backups": "/backups",
	"/admin/audit-logs": "/audit-logs",
	"/admin/activity": "/activity",
	"/admin/general": "/general",
};

// Clean /mail/* route mappings to internal (dashboard)/(settings) pages
const MAIL_REWRITES: Record<string, string> = {
	"/mail": "/inbox",
	"/mail/": "/inbox",
	"/mail/inbox": "/inbox",
	"/mail/sent": "/sent",
	"/mail/drafts": "/drafts",
	"/mail/trash": "/trash",
	"/mail/spam": "/spam",
	"/mail/starred": "/starred",
	"/mail/archived": "/archived",
	"/mail/scheduled": "/scheduled",
	"/mail/snoozed": "/snoozed",
	"/mail/compose": "/compose",
	"/mail/import-export": "/import-export",
	"/mail/settings": "/settings",
};

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

	// 3. /admin/* Namespace Rewrites
	if (ADMIN_REWRITES[pathname]) {
		return NextResponse.rewrite(new URL(`${ADMIN_REWRITES[pathname]}${search}`, request.url));
	}
	if (pathname.startsWith("/admin/mailboxes/")) {
		const remainder = pathname.slice("/admin/mailboxes/".length);
		return NextResponse.rewrite(new URL(`/accounts/${remainder}${search}`, request.url));
	}
	if (pathname.startsWith("/admin/")) {
		const remainder = pathname.slice("/admin/".length);
		return NextResponse.rewrite(new URL(`/${remainder}${search}`, request.url));
	}

	// 4. /mail/* Namespace Rewrites
	if (MAIL_REWRITES[pathname]) {
		return NextResponse.rewrite(new URL(`${MAIL_REWRITES[pathname]}${search}`, request.url));
	}
	if (pathname.startsWith("/mail/folders/")) {
		const remainder = pathname.slice("/mail/folders/".length);
		return NextResponse.rewrite(new URL(`/folders/${remainder}${search}`, request.url));
	}
	if (pathname.startsWith("/mail/settings/")) {
		const remainder = pathname.slice("/mail/settings/".length);
		return NextResponse.rewrite(new URL(`/settings/${remainder}${search}`, request.url));
	}
	if (pathname.startsWith("/mail/")) {
		const remainder = pathname.slice("/mail/".length);
		return NextResponse.rewrite(new URL(`/${remainder}${search}`, request.url));
	}

	// 5. Root Marketing Domain
	// / serves the landing page; /login serves unified sign-in
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|\\.well-known/|favicon\\.ico|manifest\\.webmanifest).*)",
	],
};
