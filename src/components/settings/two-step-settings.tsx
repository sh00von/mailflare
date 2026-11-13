"use client";

import { useState } from "react";
import { Copy, Smartphone } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { beginMfaEnrollment, confirmMfaEnrollment, disableMfa } from "./utils";
import { authErrorText } from "@/lib/auth/error-messages";
import { ClientRequestError } from "@/lib/http/client-error";
import { generateRecoveryCodes, setSecondFactorRequirement } from "./passkey-settings-utils";
import { refreshSecurityStatus, useSecurityStatus } from "./security-status-store";
import { StepUpDialog } from "./step-up-dialog";
import { FormSkeleton } from "@/components/page-skeletons";

type PendingAction = "toggle-on" | "toggle-off" | "enroll" | "disable" | "codes";

function RecoveryCodesList({ codes }: { codes: string[] }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="space-y-3">
			<ul className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-4 font-mono text-sm text-neutral-800">
				{codes.map((code) => <li key={code}>{code}</li>)}
			</ul>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => {
					void navigator.clipboard.writeText(codes.join("\n")).then(() => setCopied(true));
				}}
			>
				<Copy className="h-4 w-4" />
				{copied ? "Copied" : "Copy codes"}
			</Button>
		</div>
	);
}

export function TwoStepSettings() {
	const { status, error: loadFailed } = useSecurityStatus();
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [qrSvg, setQrSvg] = useState<string | null>(null);
	const [secret, setSecret] = useState("");
	const [code, setCode] = useState("");
	const [codes, setCodes] = useState<string[] | null>(null);

	if (!status) {
		return (
			<div className="space-y-5">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">Two-step verification</h2>
					<p className="mt-1 text-sm text-neutral-500">Require an authenticator app code after password sign-in.</p>
				</div>
				{loadFailed ? <p role="alert" className="text-sm text-neutral-500">Failed to load</p> : <FormSkeleton rows={1} />}
			</div>
		);
	}

	const hasAnyFactor = status.totpEnabled;
	const actionForPending = pending === "enroll"
		? "mfa.enroll"
		: pending === "disable"
			? "mfa.disable"
			: pending === "codes"
				? "mfa.codes"
				: "second_factor.toggle";

	async function authorized(token: string) {
		setError(null);
		if (pending === "enroll") {
			const enrollment = await beginMfaEnrollment(null, token);
			setQrSvg(enrollment.qrSvg);
			setSecret(enrollment.secret);
		} else if (pending === "disable") {
			await disableMfa({ stepUpToken: token });
			await refreshSecurityStatus(true);
		} else if (pending === "codes") {
			setCodes(await generateRecoveryCodes(token));
			await refreshSecurityStatus(true);
		} else {
			await setSecondFactorRequirement(pending === "toggle-on", token);
			await refreshSecurityStatus(true);
		}
		setPending(null);
	}

	async function confirmEnrollment(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			setCodes(await confirmMfaEnrollment(code));
			setQrSvg(null);
			setCode("");
			await refreshSecurityStatus(true);
		} catch (err) {
			setError(authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Could not confirm"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-5">
			<div>
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-2.5">
						<h2 className="text-lg font-semibold text-neutral-900">Two-step verification (2FA)</h2>
						<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
							Optional
						</span>
					</div>
					{status.passwordSet && (
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-neutral-500 hidden sm:inline">
								{status.requireSecondFactor ? "2FA Required" : "2FA Optional (Off)"}
							</span>
							<Switch
								checked={status.requireSecondFactor}
								disabled={busy || (!hasAnyFactor && !status.requireSecondFactor)}
								onCheckedChange={(enabled) => setPending(enabled ? "toggle-on" : "toggle-off")}
								aria-label={"Require an authenticator code after password sign-in"}
							/>
						</div>
					)}
				</div>
				<p className="mt-1 text-sm text-neutral-500">
					Add an extra layer of security with Google Authenticator, Microsoft Authenticator, Authy, or 1Password. When enabled, signing in requires your password and a 6-digit code from your phone.
				</p>
			</div>

			<div className="rounded-2xl border border-neutral-100 p-4 bg-neutral-50/50">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3">
						<Smartphone className={`mt-0.5 h-5 w-5 shrink-0 ${status.totpEnabled ? "text-emerald-600" : "text-neutral-400"}`} />
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-semibold text-neutral-900">Authenticator App (TOTP)</h3>
								{status.totpEnabled ? (
									status.requireSecondFactor ? (
										<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
											Enforced on Login
										</span>
									) : (
										<span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
											Configured · Optional
										</span>
									)
								) : (
									<span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
										Not set up
									</span>
								)}
							</div>
							<p className="mt-1 text-xs sm:text-sm text-neutral-500">
								{status.totpEnabled
									? `Configured with ${status.recoveryCodesLeft ?? 0} emergency recovery codes available.`
									: "Scan a QR code with your authenticator app to enable."}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{status.totpEnabled ? (
							<>
								<Button variant="outline" size="sm" onClick={() => setPending("codes")} disabled={busy}>New recovery codes</Button>
								<Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setPending("disable")} disabled={busy}>Remove 2FA</Button>
							</>
						) : (
							<Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setPending("enroll")} disabled={busy}>Add authenticator app</Button>
						)}
					</div>
				</div>
			</div>

			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}

			<StepUpDialog
				open={!!pending}
				hasPassword={status.passwordSet}
				hasPasskey={false}
				requireSecondFactor={status.requireSecondFactor}
				totpEnabled={status.totpEnabled}
				action={actionForPending}
				onOpenChange={(open) => !open && setPending(null)}
				onAuthorized={authorized}
			/>

			<Dialog open={!!qrSvg} onOpenChange={(open) => !open && setQrSvg(null)}>
				<DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[480px]">
					<form onSubmit={confirmEnrollment} className="space-y-4">
						<DialogHeader>
							<DialogTitle>Scan the code</DialogTitle>
							<DialogDescription>Open your authenticator app, add an account by scanning this code, then enter the 6-digit code it shows.</DialogDescription>
						</DialogHeader>
						<div role="img" aria-label={"Scan the code"} className="mx-auto w-48 rounded-xl border border-neutral-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg ?? "" }} />
						<details className="text-xs text-neutral-500">
							<summary className="cursor-pointer">{"Can't scan? Enter the key manually"}</summary>
							<code className="mt-2 block break-all rounded-md bg-neutral-50 p-2 font-mono text-neutral-800">{secret}</code>
						</details>
						<div className="space-y-2">
							<Label htmlFor="mfa-code">6-digit code</Label>
							<Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123 456" required autoFocus />
						</div>
						{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
						<Button type="submit" disabled={busy}>{busy ? "Checking..." : "Verify and turn on"}</Button>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={!!codes} onOpenChange={(open) => !open && setCodes(null)}>
				<DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[480px]">
					<div className="space-y-4">
						<DialogHeader>
							<DialogTitle>Save your recovery codes</DialogTitle>
							<DialogDescription>Authenticator codes are on. Save these recovery codes; they only work with the authenticator-app flow.</DialogDescription>
						</DialogHeader>
						<RecoveryCodesList codes={codes ?? []} />
						<Button type="button" onClick={() => setCodes(null)}>Done</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
