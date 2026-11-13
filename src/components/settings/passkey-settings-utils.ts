import { authFetch } from "@/lib/auth/client";
import { requestError } from "@/lib/http/client-error";
import type {
	SecurityStatus,
	StepUpResponse,
} from "./passkey-settings-types";

export async function loadSecurityStatus(): Promise<SecurityStatus> {
	const res = await authFetch("/api/settings/security");
	const data = (await res.json()) as SecurityStatus;
	if (!res.ok) throw requestError(data, "Could not load security settings");
	return data;
}

export async function stepUpWithPassword(password: string, code: string | undefined, action: string, targetUserId?: string): Promise<string> {
	const res = await authFetch("/api/auth/step-up", {
		method: "POST",
		redirectOnUnauthorized: false,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password, code, action, targetUserId }),
	});
	const data = (await res.json()) as StepUpResponse;
	if (!res.ok || !data.stepUpToken) throw requestError(data, "Verification failed");
	return data.stepUpToken;
}

export async function setSecondFactorRequirement(enabled: boolean, stepUpToken: string): Promise<void> {
	const res = await authFetch("/api/settings/second-factor", {
		method: "POST",
		redirectOnUnauthorized: false,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ enabled, stepUpToken }),
	});
	if (!res.ok) throw requestError(await res.json(), "Could not update the second-step setting");
}

export async function generateRecoveryCodes(stepUpToken: string): Promise<string[]> {
	const res = await authFetch("/api/settings/mfa/recovery-codes", {
		method: "POST",
		redirectOnUnauthorized: false,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ stepUpToken }),
	});
	const data = (await res.json()) as { recoveryCodes?: string[]; error?: string; code?: string };
	if (!res.ok || !data.recoveryCodes) throw requestError(data, "Could not generate recovery codes");
	return data.recoveryCodes;
}

export async function setPassword(newPassword: string, stepUpToken: string, requireSecondFactor?: boolean): Promise<void> {
	const res = await authFetch("/api/settings/password", {
		method: "POST",
		redirectOnUnauthorized: false,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ newPassword, stepUpToken, requireSecondFactor }),
	});
	if (!res.ok) throw requestError(await res.json(), "Could not set a password");
}
