"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchSessionInfo, peekSessionInfo, type SessionInfo } from "@/hooks/use-current-user";
import type { AuthGuardProps } from "./auth-guard-types";
import { LoadingTransition } from "@/components/loading-transition";
import { saveUserTimeZonePreference } from "@/lib/time/client";

/** Attempts before a protected page gives up waiting for /api/auth/me. */
const SESSION_CHECK_ATTEMPTS = 3;

async function loadSession(useCache: boolean): Promise<SessionInfo | null> {
	const cached = useCache ? peekSessionInfo() : null;
	if (cached && cached.isSetup !== false && cached.hasMailboxes !== false) return cached;
	for (let attempt = 0; attempt < SESSION_CHECK_ATTEMPTS; attempt += 1) {
		const response = await fetchSessionInfo({ fresh: true });
		// A 5xx is as inconclusive as a network failure: try again before giving up.
		if (response && response.status < 500) return response;
		if (attempt < SESSION_CHECK_ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
	}
	return null;
}

/**
 * Protected pages fail closed: the app renders only after the server confirms a signed-in
 * session. A missing session goes to /login; an unreachable server shows a retry screen, never
 * the app itself.
 */
export function AuthGuard({ children, mode = "protected", requireMailbox, requireRole, requirePrimary, requireFeature, allowAuthenticated }: AuthGuardProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [authorized, setAuthorized] = useState(mode === "public");
	const [unreachable, setUnreachable] = useState(false);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let cancelled = false;

		async function checkSession() {
			try {
				// Login pages and onboarding change the answer, so only a finished setup is reused across navigations.
				const response = await loadSession(mode === "protected");
				if (cancelled) return;

				if (mode === "public") {
					if (response?.status === 200 && !allowAuthenticated) router.replace("/inbox");
					return;
				}

				if (!response || response.status >= 500) {
					setAuthorized(false);
					setUnreachable(true);
					return;
				}

				if (response.status !== 200 || !response.user?.id) {
					setAuthorized(false);
					router.replace("/login");
					return;
				}

				const data = response;
				setUnreachable(false);
				saveUserTimeZonePreference(data.user!.id, data.user!.timeZone ?? null);

				if (requireMailbox && data.hasMailboxes === false && data.user?.role === "admin" && data.isSetup === false && pathname !== "/setup") {
					router.replace("/setup");
					return;
				}

				if (pathname === "/setup" && data.isSetup === true) {
					router.replace("/inbox");
					return;
				}

				if (requireRole && data.user?.role !== requireRole) {
					router.replace("/inbox");
					return;
				}

				if (requirePrimary && !data.user?.isPrimaryAdmin) {
					router.replace("/admin");
					return;
				}

				if ((requireFeature === "calendar" && data.user?.calendarEnabled === false)
					|| (requireFeature === "drive" && data.user?.driveEnabled === false)) {
					router.replace("/inbox");
					return;
				}

				setAuthorized(true);
			} catch {
				if (cancelled || mode === "public") return;
				setAuthorized(false);
				setUnreachable(true);
			}
		}

		void checkSession();

		return () => {
			cancelled = true;
		};
	}, [mode, pathname, requireMailbox, requireRole, requirePrimary, requireFeature, allowAuthenticated, router, attempt]);

	useEffect(() => {
		const refreshTimeZone = (event: StorageEvent) => {
			if (event.key === "replyot-user-time-zone") window.location.reload();
		};
		window.addEventListener("storage", refreshTimeZone);
		return () => window.removeEventListener("storage", refreshTimeZone);
	}, []);

	if (mode === "public") return <>{children}</>;
	if (unreachable) {
		return (
			<div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-100 px-6 text-center">
				<h1 className="text-2xl font-normal text-neutral-900">Can’t reach the server</h1>
				<p className="max-w-sm text-sm leading-6 text-neutral-500">We couldn’t confirm that you’re signed in. Check your connection and try again.</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setUnreachable(false);
							setAttempt((value) => value + 1);
						}}
						className="h-10 rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						Try again
					</button>
					<button
						type="button"
						onClick={() => router.replace("/login")}
						className="h-10 rounded-full px-5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
					>
						Go to sign in
					</button>
				</div>
			</div>
		);
	}
	return <LoadingTransition ready={authorized}>{children}</LoadingTransition>;
}
