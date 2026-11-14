"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import { CaptchaField } from "@/components/auth/captcha-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "./utils";

export function ForgotPasswordClient() {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [captchaReset, setCaptchaReset] = useState(0);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const result = await requestPasswordReset(new FormData(event.currentTarget));
			if (!result.ok) {
				setError(result.error ?? "Something went wrong. Please try again.");
				setCaptchaReset((value) => value + 1);
				return;
			}
			setSent(true);
		} catch {
			setError("Unable to reach the server. Please try again.");
			setCaptchaReset((value) => value + 1);
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthShell
			icon={KeyRound}
			title={"Reset your password"}
			description={
				sent
					? "If we found your account, we've sent a reset link to its backup email. The link works for 30 minutes."
					: "Enter the email you sign in with. We'll send a reset link to your backup email."
			}
			footer={
				<Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-800">
					Back to sign in
				</Link>
			}
		>
			{!sent && (
				<form onSubmit={onSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
					</div>
					{error && (
						<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
					)}
					<CaptchaField resetSignal={captchaReset} />
					<Button type="submit" className="h-11 w-full rounded-full px-6 active:scale-[0.98]" disabled={loading}>
						{loading ? "Sending..." : "Send reset link"}
					</Button>
				</form>
			)}
		</AuthShell>
	);
}
