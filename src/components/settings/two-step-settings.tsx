"use client";

import { useState } from "react";
import { Copy, KeyRound, Smartphone } from "@/components/icons";
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

/**
 * Controls the extra step after a password sign-in. Passkeys are one possible
 * second step; an authenticator app is the other. Direct passkey sign-in never
 * needs an additional step.
 */
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
					<p className="mt-1 text-sm text-neutral-500">Add an extra step after password sign-in. Passkeys and authenticator apps both qualify; signing in directly with a passkey never needs another step.</p>
				</div>
				{loadFailed ? <p role="alert" className="text-sm text-neutral-500">Failed to load</p> : <FormSkeleton rows={1} />}
			</div>
		);
	}

	const hasAnyFactor = status.passkeys.length > 0 || status.totpEnabled;
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
					<h2 className="text-lg font-semibold text-neutral-900">Two-step verification</h2>
					{status.passwordSet && (
						<Switch
							checked={status.requireSecondFactor}
							disabled={busy || (!hasAnyFactor && !status.requireSecondFactor)}
							onCheckedChange={(enabled) => setPending(enabled ? "toggle-on" : "toggle-off")}
							aria-label={"Require a second step after password sign-in"}
						/>
					)}
				</div>
				<p className="mt-1 text-sm text-neutral-500">{status.passwordSet ? "Add an extra step after password sign-in. Passkeys and authenticator apps both qualify; signing in directly with a passkey never needs another step." : "This account has no password. Passkeys sign you in directly, so no extra step is needed."}</p>
			</div>

			{status.passwordSet && !hasAnyFactor && (
				<p className="text-xs leading-5 text-neutral-500">Add a passkey or an authenticator app to turn this on.</p>
			)}

			{/* An enabled authenticator stays visible on a passwordless account so it can be turned off. */}
			{(status.passwordSet || status.totpEnabled) && (
				<div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
					{status.passwordSet && (
						<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-start gap-3">
								<KeyRound className={`mt-0.5 h-5 w-5 shrink-0 ${status.passkeys.length > 0 ? "text-green-600" : "text-neutral-400"}`} />
								<div>
									<h3 className="text-sm font-semibold text-neutral-900">Passkey</h3>
									<p className="mt-1 text-sm text-neutral-500">
										{status.passkeys.length > 0 ? (status.passkeys.length === 1 ? `${status.passkeys.length} passkey can confirm a password sign-in.` : `${status.passkeys.length} passkeys can confirm a password sign-in.`) : "No passkeys enrolled."}
									</p>
								</div>
							</div>
							<Button asChild variant="outline" size="sm" className="w-fit">
								<a href="#passkeys">Manage passkeys</a>
							</Button>
						</div>
					)}
					<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-3">
							<Smartphone className={`mt-0.5 h-5 w-5 shrink-0 ${status.totpEnabled ? "text-green-600" : "text-neutral-400"}`} />
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">Authenticator app</h3>
								<p className="mt-1 text-sm text-neutral-500">
									{status.totpEnabled
										? (status.recoveryCodesLeft === 1 ? `Set up · ${status.recoveryCodesLeft} recovery code left.` : `Set up · ${status.recoveryCodesLeft} recovery codes left.`)
										: "Not set up."}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{status.totpEnabled ? (
								<>
									<Button variant="outline" size="sm" onClick={() => setPending("codes")} disabled={busy}>New recovery codes</Button>
									<Button variant="ghost" size="sm" onClick={() => setPending("disable")} disabled={busy}>Turn off</Button>
								</>
							) : (
								<Button size="sm" onClick={() => setPending("enroll")} disabled={busy}>Add authenticator app</Button>
							)}
						</div>
					</div>
				</div>
			)}

			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}

			<StepUpDialog
				open={!!pending}
				hasPassword={status.passwordSet}
				hasPasskey={status.passkeys.length > 0}
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
