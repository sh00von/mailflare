"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole, ShieldAlert } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import {
	AUTH_ERROR_CLASS,
	AUTH_LABEL_CLASS,
	AUTH_PRIMARY_BUTTON_CLASS,
	AUTH_TEXT_BUTTON_CLASS,
} from "@/components/auth/auth-ui-utils";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset } from "./utils";

export function ResetPasswordClient() {
	const token = useSearchParams().get("token") ?? "";
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (password !== confirm) {
			setError("Passwords do not match");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const result = await confirmPasswordReset(token, password);
			if (!result.ok) {
				setError(result.error ?? "Could not reset the password");
				return;
			}
			setDone(true);
		} catch {
			setError("Unable to reach the server. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (!token) {
		return (
			<AuthShell
				icon={ShieldAlert}
				title="Reset link invalid or missing"
				description="Please open the full link from the reset email, or request a new password reset link."
			>
				<div className="space-y-4 pt-2">
					<Link href="/forgot-password" className="block w-full">
						<Button className={AUTH_PRIMARY_BUTTON_CLASS}>
							Request a new reset link
						</Button>
					</Link>
					<div className="text-center">
						<Link href="/login" className={AUTH_TEXT_BUTTON_CLASS}>
							Back to sign in
						</Link>
					</div>
				</div>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			icon={done ? CheckCircle2 : LockKeyhole}
			title={done ? "Password updated" : "Choose a new password"}
			description={
				done
					? "Your password has been changed. You're signed out on all other devices."
					: "Use at least 8 characters. You'll be signed out on your other devices."
			}
		>
			{done ? (
				<div className="space-y-6">
					<div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
						<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
						<div className="space-y-1">
							<p className="font-semibold text-emerald-950">Security updated</p>
							<p className="text-xs leading-relaxed text-emerald-800">
								Your account has been secured with your new password. You can now sign in immediately.
							</p>
						</div>
					</div>

					<div className="pt-2">
						<Link href="/login" className="block w-full">
							<Button className={AUTH_PRIMARY_BUTTON_CLASS}>
								Sign in with new password
							</Button>
						</Link>
					</div>
				</div>
			) : (
				<form onSubmit={onSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="password" className={AUTH_LABEL_CLASS}>New password</Label>
						<PasswordInput
							id="password"
							name="password"
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							minLength={8}
							placeholder="••••••••"
							required
							autoFocus
						/>
						<p className="text-xs text-neutral-500">Minimum 8 characters.</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirm" className={AUTH_LABEL_CLASS}>Confirm new password</Label>
						<PasswordInput
							id="confirm"
							name="confirm"
							autoComplete="new-password"
							value={confirm}
							onChange={(event) => setConfirm(event.target.value)}
							minLength={8}
							placeholder="••••••••"
							required
						/>
					</div>

					{error && (
						<p role="alert" className={AUTH_ERROR_CLASS}>
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							{error}
						</p>
					)}

					<div className="flex items-center justify-between gap-3 pt-2">
						<Link href="/login" className={AUTH_TEXT_BUTTON_CLASS}>
							Cancel
						</Link>
						<Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
							{loading ? (
								<span className="flex items-center gap-2">
									<LoaderCircle className="h-4 w-4 animate-spin" />
									Saving...
								</span>
							) : (
								"Set new password"
							)}
						</Button>
					</div>
				</form>
			)}
		</AuthShell>
	);
}
