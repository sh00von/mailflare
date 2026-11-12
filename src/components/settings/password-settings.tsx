"use client";

import { useState } from "react";
import { KeyRound } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "./utils";
import { authErrorText } from "@/lib/auth/error-messages";
import { ClientRequestError } from "@/lib/http/client-error";
import { removePassword, setPassword } from "./passkey-settings-utils";
import { refreshSecurityStatus, useSecurityStatus } from "./security-status-store";
import { StepUpDialog } from "./step-up-dialog";
import { PasskeyFirstChoice, type PasskeyPolicyChoice } from "./passkey-first-choice";
import { FormSkeleton } from "@/components/page-skeletons";

/**
 * Password controls that understand passkey-only accounts: set one, change it,
 * or remove it once another sign-in method exists.
 */
export function PasswordSettings() {
	const { status, error: loadFailed } = useSecurityStatus();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState<"set" | "remove" | null>(null);
	const [confirmRemove, setConfirmRemove] = useState(false);
	const [passwordProof, setPasswordProof] = useState<string | null>(null);

	async function change(event: React.FormEvent) {
		event.preventDefault();
		setMessage(null);
		setError(null);
		if (newPassword !== confirmPassword) {
			setError("New passwords do not match");
			return;
		}
		setBusy(true);
		try {
			await updatePassword(currentPassword, newPassword);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setMessage("Password changed");
			await refreshSecurityStatus(true);
		} catch (err) {
			setError(authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Failed to change password"));
		} finally {
			setBusy(false);
		}
	}

	async function authorized(token: string) {
		setError(null);
		if (pending === "set") {
			setPasswordProof(token);
			setPending(null);
			return;
		} else {
			await removePassword(token);
			setMessage("Password removed. Your passkeys are now the only way to sign in.");
		}
		await refreshSecurityStatus(true);
		setPending(null);
	}

	async function choosePasswordPolicy(choice: PasskeyPolicyChoice) {
		if (!passwordProof || busy) return;
		if (choice === "passkey-only") {
			setPasswordProof(null);
			setNewPassword("");
			setConfirmPassword("");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await setPassword(newPassword, passwordProof, choice === "password-and-passkey");
			setMessage("Password set");
			setNewPassword("");
			setConfirmPassword("");
			await refreshSecurityStatus(true);
		} catch (err) {
			setError(authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Failed to change password"));
			await refreshSecurityStatus(true);
		} finally {
			setPasswordProof(null);
			setBusy(false);
		}
	}

	if (!status) return loadFailed ? <p role="alert" className="text-sm text-neutral-500">Could not load password settings</p> : <FormSkeleton rows={2} />;

	return (
		<div className="space-y-4">
			{status.passwordSet ? (
				<form onSubmit={change} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="currentPassword">Current password</Label>
						<Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="newPassword">New password</Label>
						<Input id="newPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm new password</Label>
						<Input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button type="submit" disabled={busy}>{busy ? "Changing..." : "Change password"}</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmRemove(true)}
							disabled={busy || status.passkeys.length === 0}
							title={status.passkeys.length === 0 ? "Add a passkey before removing your password." : undefined}
						>
							Remove password
						</Button>
					</div>
					{status.passkeys.length === 0 ? (
						<p className="text-xs leading-5 text-neutral-500">Add a passkey before removing your password.</p>
					) : (
						// Without a second step the password is the weakest factor, so the
						// passkey-only account is the better one.
						!status.requireSecondFactor && (
							<p className="text-xs leading-5 text-neutral-500">Recommended: your passkey signs you in on its own, so the password is no longer needed.</p>
						)
					)}
				</form>
			) : (
				<form
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						setError(null);
						if (newPassword !== confirmPassword) {
							setError("New passwords do not match");
							return;
						}
						setPending("set");
					}}
				>
					<p className="text-sm text-neutral-500">This account signs in with passkeys only. Set a password if you want one as a fallback.</p>
					<div className="space-y-2">
						<Label htmlFor="setPassword">New password</Label>
						<Input id="setPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="setPasswordConfirm">Confirm new password</Label>
						<Input id="setPasswordConfirm" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
					</div>
					<Button type="submit" disabled={busy}>
						<KeyRound className="h-4 w-4" />
						Set password
					</Button>
				</form>
			)}

			{message && <p role="status" className="text-sm text-neutral-500">{message}</p>}
			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}

			<Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle>Remove your password?</DialogTitle>
						<DialogDescription>Password sign-in will stop working. Your passkeys will be the only way to sign in.</DialogDescription>
					</DialogHeader>
					<p className="mb-4 text-sm leading-6 text-neutral-500">Lost every passkey? Ask an administrator for a recovery link. If you are the only administrator, use the server recovery procedure.</p>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => setConfirmRemove(false)}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => {
								setConfirmRemove(false);
								setPending("remove");
							}}
						>
							Remove password
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<StepUpDialog
				open={!!pending}
				hasPassword={status.passwordSet}
				hasPasskey={status.passkeys.length > 0}
				requireSecondFactor={status.requireSecondFactor}
				totpEnabled={status.totpEnabled}
				action={pending === "set" ? "password.set" : "password.remove"}
				onOpenChange={(open) => !open && setPending(null)}
				onAuthorized={authorized}
			/>
			<PasskeyFirstChoice
				open={passwordProof !== null}
				context="add-password"
				totpEnabled={status.totpEnabled}
				busy={busy}
				onOpenChange={() => {}}
				onChoose={(choice) => void choosePasswordPolicy(choice)}
			/>
		</div>
	);
}
