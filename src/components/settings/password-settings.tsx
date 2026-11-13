"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "./utils";
import { authErrorText } from "@/lib/auth/error-messages";
import { ClientRequestError } from "@/lib/http/client-error";
import { refreshSecurityStatus, useSecurityStatus } from "./security-status-store";
import { FormSkeleton } from "@/components/page-skeletons";

export function PasswordSettings() {
	const { status, error: loadFailed } = useSecurityStatus();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

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
			setMessage("Password changed successfully");
			await refreshSecurityStatus(true);
		} catch (err) {
			setError(authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Failed to change password"));
		} finally {
			setBusy(false);
		}
	}

	if (!status) return loadFailed ? <p role="alert" className="text-sm text-neutral-500">Could not load password settings</p> : <FormSkeleton rows={2} />;

	return (
		<div className="space-y-4">
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
				</div>
			</form>

			{message && <p role="status" className="text-sm text-green-600 font-medium">{message}</p>}
			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
		</div>
	);
}
