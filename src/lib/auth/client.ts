"use client";

import { getUserTimeZone } from "@/lib/time/utils";
import { clearUserTimeZonePreference } from "@/lib/time/client";
import type {
	AuthFetchOptions,
	AuthSessionChangedDetail,
	AuthSessionResponse,
} from "./client-types";

const SESSION_STORAGE_KEY = "replyot-session-token";
export const AUTH_SESSION_CHANGED_EVENT = "replyot:auth-session-changed";

function dispatchAuthSessionChanged(authenticated: boolean): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<AuthSessionChangedDetail>(AUTH_SESSION_CHANGED_EVENT, {
			detail: { authenticated },
		}),
	);
}

const MARKER_PREFIX = "m:";

/**
 * A non-secret fingerprint of a session token (FNV-1a over the token, two seeds). The token itself lives only in
 * the httpOnly session cookie, so script injected into the page cannot read and replay it; the fingerprint only
 * tells tabs and caches which session is active.
 */
function sessionMarker(token: string): string {
	let a = 0x811c9dc5;
	let b = 0x01000193 ^ token.length;
	for (let i = 0; i < token.length; i++) {
		const c = token.charCodeAt(i);
		a = Math.imul(a ^ c, 0x01000193);
		b = Math.imul(b ^ c, 0x5bd1e995);
	}
	return `${MARKER_PREFIX}${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

/** The active session's marker (not the token), or null when this browser has no session. */
export function getClientSessionToken(): string | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!stored || stored.startsWith(MARKER_PREFIX)) return stored;
	// Older builds stored the raw bearer token here; replace it with its marker.
	const marker = sessionMarker(stored);
	localStorage.setItem(SESSION_STORAGE_KEY, marker);
	return marker;
}

export function setClientSessionToken(token: string): void {
	const previous = getClientSessionToken();
	const marker = sessionMarker(token);
	localStorage.setItem(SESSION_STORAGE_KEY, marker);
	if (previous !== marker) clearUserTimeZonePreference();
	if (previous !== marker) dispatchAuthSessionChanged(true);
}

export function clearClientSessionToken(): void {
	localStorage.removeItem(SESSION_STORAGE_KEY);
	clearUserTimeZonePreference();
	dispatchAuthSessionChanged(false);
}

export function getAuthHeaders(headers?: HeadersInit): Headers {
	const nextHeaders = new Headers(headers);
	if (typeof window !== "undefined" && !nextHeaders.has("X-Time-Zone")) {
		nextHeaders.set("X-Time-Zone", getUserTimeZone());
	}
	return nextHeaders;
}

export async function authFetch(input: RequestInfo | URL, init: AuthFetchOptions = {}): Promise<Response> {
	const { redirectOnUnauthorized = true, headers, ...requestInit } = init;
	const response = await fetch(input, {
		...requestInit,
		headers: getAuthHeaders(headers),
	});

	if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
		clearClientSessionToken();
		window.location.assign("/login");
	}

	return response;
}

export async function persistAuthSession(response: Response): Promise<AuthSessionResponse> {
	const data = (await response.json()) as AuthSessionResponse;
	if (response.ok && data.token) setClientSessionToken(data.token);
	return data;
}
