"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorText } from "@/lib/auth/error-messages";
import { ClientRequestError } from "@/lib/http/client-error";
import { stepUpWithPassword } from "./passkey-settings-utils";

export function StepUpDialog({
	open,
	hasPassword,
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
	step?: { current: number; total: number };
	targetUserId?: string;
	onOpenChange: (open: boolean) => void;
	onAuthorized: (stepUpToken: string) => void | boolean | Promise<void | boolean>;
}) {
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const needsCode = hasPassword && totpEnabled && (requireSecondFactor || action === "mfa.disable");

	function close(next: boolean) {
		onOpenChange(next);
		if (!next) {
			setPassword("");
			setCode("");
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
				setPassword("");
				setCode("");
				return;
			}
			close(false);
		} catch (err) {
			setError(authErrorText(err instanceof ClientRequestError ? err.code : undefined, "Verification failed"));
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
					<DialogDescription>{description ?? "Confirm your password to continue."}</DialogDescription>
				</DialogHeader>
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
							autoFocus
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
					<Button type="submit" disabled={busy}>
						{busy ? "Please wait..." : "Continue"}
					</Button>
				</form>
				{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
			</DialogContent>
		</Dialog>
	);
}
