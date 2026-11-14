import { clearClientSessionToken } from "@/lib/auth/client";
import type {
	DomainSetupResult,
	MxCheckResult,
	RegisterResult,
	SetupPreparationResult,
	SetupStatus,
} from "./types";

export async function prepareSetup(): Promise<{ ok: boolean; data: SetupPreparationResult }> {
	const res = await fetch("/api/setup/prepare", { method: "POST" });
	return {
		ok: res.ok,
		data: (await res.json()) as SetupPreparationResult,
	};
}

export async function getSetupStatus(): Promise<SetupStatus> {
	const res = await fetch("/api/setup/status");
	const data = (await res.json()) as SetupStatus;
	if (!res.ok) throw new Error(data.error ?? "Could not load setup status");
	return data;
}

export async function submitPrimaryDomain(hostname: string): Promise<{ ok: boolean; data: DomainSetupResult }> {
	const res = await fetch("/api/setup/domain", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ hostname }),
	});

	return {
		ok: res.ok,
		data: (await res.json()) as DomainSetupResult,
	};
}

export async function checkExistingMx(hostname: string): Promise<{ ok: boolean; data: MxCheckResult }> {
	const res = await fetch("/api/setup/domain/mx", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ hostname }),
	});

	return {
		ok: res.ok,
		data: (await res.json()) as MxCheckResult,
	};
}

export async function sendRegisterVerificationCode(
	email: string,
	captchaAnswer?: string,
	captchaToken?: string,
): Promise<{ ok: boolean; error?: string }> {
	const res = await fetch("/api/auth/register/send-code", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, captchaAnswer, captchaToken }),
	});
	const data = (await res.json().catch(() => ({}))) as { error?: string };
	if (!res.ok) {
		return { ok: false, error: data.error || "Failed to send verification code" };
	}
	return { ok: true };
}

export async function submitRegistration(
	form: FormData,
	payload: { firstRun: boolean; domain: string; orgName?: string; plan?: string; enableSending?: boolean; replaceMxRecords?: boolean; skipDns?: boolean; verificationCode?: string },
): Promise<{ ok: boolean; data: RegisterResult }> {
	const res = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(
			payload.firstRun
				? {
						domain: payload.domain,
						orgName: payload.orgName,
						plan: payload.plan,
						enableSending: payload.enableSending,
						replaceMxRecords: payload.replaceMxRecords,
						skipDns: payload.skipDns,
						username: form.get("username"),
						password: form.get("usePasskey") === "on" ? undefined : form.get("password"),
						usePasskey: form.get("usePasskey") === "on",
						resetEmail: form.get("resetEmail"),
						verificationCode: (form.get("verificationCode") as string) || payload.verificationCode,
						captchaAnswer: form.get("captchaAnswer"),
						captchaToken: form.get("captchaToken"),
					}
				: {
						username: form.get("username"),
						password: form.get("usePasskey") === "on" ? undefined : form.get("password"),
						usePasskey: form.get("usePasskey") === "on",
						resetEmail: form.get("resetEmail"),
						verificationCode: (form.get("verificationCode") as string) || payload.verificationCode,
						captchaAnswer: form.get("captchaAnswer"),
						captchaToken: form.get("captchaToken"),
					},
		),
	});

	const text = await res.text();
	let data: RegisterResult;
	try {
		data = JSON.parse(text) as RegisterResult;
	} catch {
		return {
			ok: false,
			data: { error: text || `Registration request failed (${res.status})` },
		};
	}
	if (res.ok) clearClientSessionToken();
	return { ok: res.ok, data };
}
