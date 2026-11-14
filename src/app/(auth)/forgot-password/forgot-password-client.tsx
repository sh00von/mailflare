"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, LoaderCircle, MailCheck } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import {
	AUTH_ERROR_CLASS,
	AUTH_INPUT_CLASS,
	AUTH_LABEL_CLASS,
	AUTH_PRIMARY_BUTTON_CLASS,
	AUTH_TEXT_BUTTON_CLASS,
} from "@/components/auth/auth-ui-utils";
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
			icon={sent ? MailCheck : KeyRound}
			title={sent ? "Check your recovery email" : "Reset your password"}
			description={
				sent
					? "If an account matches that email, we've sent password reset instructions."
					: "Enter your account address or recovery email to receive a password reset link."
			}
		>
			{sent ? (
				<div className="space-y-6">
					<div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
						<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
						<div className="space-y-1">
							<p className="font-semibold text-emerald-950">Instructions dispatched</p>
							<p className="text-xs leading-relaxed text-emerald-800">
								The reset link is valid for <strong>30 minutes</strong>. If you do not see it in your inbox shortly, please check your spam or junk folder.
							</p>
						</div>
					</div>

					<div className="space-y-3 pt-2">
						<Link href="/login" className="block w-full">
							<Button className={AUTH_PRIMARY_BUTTON_CLASS}>
								Return to sign in
							</Button>
						</Link>
						<div className="text-center">
							<button
								type="button"
								onClick={() => setSent(false)}
								className={AUTH_TEXT_BUTTON_CLASS}
							>
								Try another email address &rarr;
							</button>
						</div>
					</div>
				</div>
			) : (
				<form onSubmit={onSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="email" className={AUTH_LABEL_CLASS}>Email address</Label>
						<Input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							placeholder="you@company.com or recovery@gmail.com"
							className={AUTH_INPUT_CLASS}
							required
							autoFocus
						/>
						<p className="text-xs text-neutral-500">
							Enter your Mailflare sign-in address or backup recovery email.
						</p>
					</div>

					{error && (
						<p role="alert" className={AUTH_ERROR_CLASS}>
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							{error}
						</p>
					)}

					<CaptchaField resetSignal={captchaReset} />

					<div className="flex items-center justify-between gap-3 pt-2">
						<Link href="/login" className={AUTH_TEXT_BUTTON_CLASS}>
							Back to sign in
						</Link>
						<Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
							{loading ? (
								<span className="flex items-center gap-2">
									<LoaderCircle className="h-4 w-4 animate-spin" />
									Sending link...
								</span>
							) : (
								"Send reset link"
							)}
						</Button>
					</div>
				</form>
			)}
		</AuthShell>
	);
}
