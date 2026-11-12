"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorText } from "@/lib/auth/error-messages";
import { isPasskeyCancellation } from "@/lib/auth/webauthn/browser-errors";
import { ClientRequestError } from "@/lib/http/client-error";
import { stepUpWithPasskey, stepUpWithPassword } from "./passkey-settings-utils";

/**
 * One reusable "prove it is still you" dialog. Passkeys are the primary
 * choice when available; the password path remains available where the
 * account policy allows it.
 */
export function StepUpDialog({
	open,
	hasPassword,
	hasPasskey = false,
	requireSecondFactor = false,
	totpEnabled = false,
	action,
	title,
	description,
	step,
	targetUserId,
	onOpenChange,
	onAuthorized,
}: {
	open: boolean;
	hasPassword: boolean;
	hasPasskey?: boolean;
	requireSecondFactor?: boolean;
	totpEnabled?: boolean;
	action: string;
	title?: string;
	description?: string;
	/** Position in a multi-step flow, so each confirmation says where it is. */
	step?: { current: number; total: number };
	targetUserId?: string;
	onOpenChange: (open: boolean) => void;
	/** Return true to keep the dialog open for the next step of the same flow. */
	onAuthorized: (stepUpToken: string) => void | boolean | Promise<void | boolean>;
}) {
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const passwordPathAllowed = hasPassword && (!requireSecondFactor || totpEnabled);
	const needsCode = hasPassword && totpEnabled && (requireSecondFactor || action === "mfa.disable");
	const showPasswordForm = !hasPasskey || showPassword || !passwordPathAllowed;
	const canUsePasskey = hasPasskey;

	function close(next: boolean) {
		onOpenChange(next);
		if (!next) {
			setPassword("");
			setCode("");
			setShowPassword(false);
			setError(null);
		}
	}

	async function authorize(getToken: () => Promise<string>) {
		setBusy(true);
		setError(null);
		try {
			const token = await getToken();
			const keepOpen = await onAuthorized(token);
			if (keepOpen === true) {
				// The next step of the same flow asks for its own proof.
				setPassword("");
				setCode("");
				setShowPassword(false);
				return;
			}
			close(false);
		} catch (err) {
			setError(
				isPasskeyCancellation(err)
					? "The passkey prompt was cancelled or timed out."
					: authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Verification failed"),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={close}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					{step && step.total > 1 && (
						<p aria-live="polite" className="text-xs font-medium uppercase tracking-wide text-neutral-400">
							{`Step ${step.current} of ${step.total}`}
						</p>
					)}
					<DialogTitle>{title ?? "Confirm it is you"}</DialogTitle>
					<DialogDescription>{description ?? "Confirm your password or use a passkey to continue."}</DialogDescription>
				</DialogHeader>
				{canUsePasskey && (
					<div className="space-y-3">
						<Button type="button" className="w-full" onClick={() => void authorize(() => stepUpWithPasskey(action, targetUserId))} disabled={busy}>
							<KeyRound className="h-4 w-4" />
							{busy ? "Waiting for your device..." : "Confirm with a passkey"}
						</Button>
						<p className="flex items-start gap-2 text-xs leading-5 text-neutral-500">
							<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
							You will be asked for your fingerprint, face, or device PIN.
						</p>
						{passwordPathAllowed && (
							<p className="text-center text-xs uppercase tracking-wide text-neutral-400">or</p>
						)}
					</div>
				)}
				{showPasswordForm && passwordPathAllowed && (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void authorize(() => stepUpWithPassword(password, needsCode ? code : undefined, action, targetUserId));
						}}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="step-up-password">Password</Label>
							<Input
								id="step-up-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								autoFocus={!canUsePasskey}
								required
							/>
						</div>
						{needsCode && (
							<div className="space-y-2">
								<Label htmlFor="step-up-code">Code</Label>
								<Input
									id="step-up-code"
									inputMode="text"
									autoComplete="one-time-code"
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
									value={code}
									onChange={(event) => setCode(event.target.value)}
									placeholder={"123 456 or abcde-fghjk"}
									required
								/>
							</div>
						)}
						<Button type="submit" variant={canUsePasskey ? "outline" : "default"} disabled={busy}>
							{busy ? "Please wait..." : "Continue"}
						</Button>
					</form>
				)}
				{!canUsePasskey && !passwordPathAllowed && (
					<p role="alert" className="text-sm text-red-600">This account has no usable way to confirm this change.</p>
				)}
				{canUsePasskey && passwordPathAllowed && !showPassword && (
					<button type="button" className="w-full text-center text-sm text-neutral-500 hover:text-neutral-800" onClick={() => setShowPassword(true)}>
						Use a password instead
					</button>
				)}
				{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
			</DialogContent>
		</Dialog>
	);
}
