import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PATHS = [
	"/admin",
	"/domains",
	"/accounts",
	"/general",
	"/plan",
	"/workspaces",
	"/spam-filter",
	"/activity",
	"/backups",
	"/audit-logs",
];

const MAIL_PATHS = [
	"/inbox",
	"/sent",
	"/drafts",
	"/spam",
	"/trash",
	"/starred",
	"/archived",
	"/scheduled",
	"/snoozed",
	"/folders",
	"/compose",
	"/settings",
	"/import-export",
];

const AUTH_PATHS = [
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
	return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	// Support /dash (admin) and /mail (webmail) path shortcuts on any domain
	if (pathname === "/dash") {
		return NextResponse.rewrite(new URL(`/domains${search}`, request.url));
	}
	if (pathname.startsWith("/dash/")) {
		const target = pathname.slice("/dash".length) || "/domains";
		return NextResponse.rewrite(new URL(`${target}${search}`, request.url));
	}
	if (pathname === "/mail") {
		return NextResponse.rewrite(new URL(`/inbox${search}`, request.url));
	}
	if (pathname.startsWith("/mail/")) {
		const target = pathname.slice("/mail".length) || "/inbox";
		return NextResponse.rewrite(new URL(`${target}${search}`, request.url));
	}

	const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
	const adminBase = process.env.ADMIN_APP_URL?.trim().replace(/\/+$/, "");
	const mailBase = process.env.MAIL_APP_URL?.trim().replace(/\/+$/, "");

	const adminHost = adminBase ? new URL(adminBase).host.toLowerCase() : "";
	const mailHost = mailBase ? new URL(mailBase).host.toLowerCase() : "";

	const isAdminHost = host.startsWith("app.") || host.startsWith("admin.") || (adminHost ? host === adminHost : false);
	const isMailHost = host.startsWith("mail.") || host.startsWith("webmail.") || (mailHost ? host === mailHost : false);

	// Admin Subdomain (e.g. app.replyot.com / app.localhost:4008)
	if (isAdminHost) {
		if (pathname === "/") {
			return NextResponse.rewrite(new URL(`/domains${search}`, request.url));
		}
		// If accessing a mail path while on admin subdomain, redirect to mail portal
		if (mailBase && matchesPrefix(pathname, MAIL_PATHS)) {
			return NextResponse.redirect(new URL(`${pathname}${search}`, mailBase));
		}
		return NextResponse.next();
	}

	// Webmail Subdomain (e.g. mail.replyot.com / mail.localhost:4008 / custom CNAME)
	if (isMailHost) {
		if (pathname === "/") {
			return NextResponse.rewrite(new URL(`/inbox${search}`, request.url));
		}
		// If accessing an admin path while on webmail subdomain, redirect to admin console
		if (adminBase && matchesPrefix(pathname, ADMIN_PATHS)) {
			return NextResponse.redirect(new URL(`${pathname}${search}`, adminBase));
		}
		// Workspace registration belongs on the admin portal
		if (adminBase && pathname === "/register") {
			return NextResponse.redirect(new URL(`/register${search}`, adminBase));
		}
		return NextResponse.next();
	}

	// Root Marketing Domain (e.g. replyot.com / localhost:4008)
	// / serves the landing page; /login serves unified sign-in
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|\\.well-known/|favicon\\.ico|manifest\\.webmanifest).*)",
	],
};
