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
	const adminBase = process.env.ADMIN_APP_URL?.trim().replace(/\/+$/, "");
	const mailBase = process.env.MAIL_APP_URL?.trim().replace(/\/+$/, "");
	if (!adminBase || !mailBase) return NextResponse.next();

	const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
	const adminHost = new URL(adminBase).host.toLowerCase();
	const mailHost = new URL(mailBase).host.toLowerCase();
	const { pathname, search } = request.nextUrl;

	if (host !== mailHost && matchesPrefix(pathname, AUTH_PATHS)) {
		return NextResponse.redirect(new URL(`${pathname}${search}`, mailBase));
	}

	if (host === adminHost) {
		if (pathname === "/") {
			return NextResponse.redirect(new URL("/domains", adminBase));
		}
		if (matchesPrefix(pathname, MAIL_PATHS)) {
			return NextResponse.redirect(new URL(`${pathname}${search}`, mailBase));
		}
	}

	if (host === mailHost) {
		if (pathname === "/") {
			return NextResponse.redirect(new URL("/inbox", mailBase));
		}
		if (matchesPrefix(pathname, ADMIN_PATHS)) {
			return NextResponse.redirect(new URL(`${pathname}${search}`, adminBase));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|jmap/|\\.well-known/|favicon\\.ico|manifest\\.webmanifest).*)",
	],
};

