"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { authErrorText } from "@/lib/auth/error-messages";
import { isPasskeyCancellation, isPasskeyUnsupported } from "@/lib/auth/webauthn/browser-errors";
import { finishPasskeySetup, loadPasskeySetupContext, startPasskeySetup } from "./utils";
import type { PasskeySetupContext } from "./types";

export function PasskeySetupClient({ token }: { token: string }) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [checking, setChecking] = useState(Boolean(token));
	const [email, setEmail] = useState<string | null>(null);
	const [kind, setKind] = useState<PasskeySetupContext["kind"]>(undefined);

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		void loadPasskeySetupContext(token)
			.then(({ ok, data }) => {
				if (cancelled) return;
				if (!ok) setLinkError(authErrorText(data.code, "This setup link is invalid or has expired."));
				else {
					setEmail(data.email ?? null);
					setKind(data.kind);
				}
			})
			.catch(() => {
				if (!cancelled) setLinkError("This setup link is invalid or has expired.");
			})
			.finally(() => {
				if (!cancelled) setChecking(false);
			});
		return () => {
			cancelled = true;
		};
	}, [token]);

	async function createPasskey(event: React.FormEvent) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			if (!browserSupportsWebAuthn()) {
				setError("This browser does not support passkeys");
				return;
			}
			const started = await startPasskeySetup(token);
			if (!started.options || !started.ceremonyToken) {
				setLinkError(authErrorText(started.code, "This setup link is invalid or has expired."));
				return;
			}
			const response = await startRegistration({ optionsJSON: started.options as Parameters<typeof startRegistration>[0]["optionsJSON"] });
			const result = await finishPasskeySetup({ token, ceremonyToken: started.ceremonyToken, response, name });
			if (!result.ok) {
				setError(authErrorText(result.data.code, "This passkey could not be verified."));
				return;
			}
			router.replace(result.data.redirect ?? "/inbox");
			router.refresh();
		} catch (err) {
			if (isPasskeyCancellation(err)) setError("The passkey prompt was cancelled or timed out.");
			else if (isPasskeyUnsupported(err)) setError("This browser does not support passkeys");
			else setError("This passkey could not be verified.");
		} finally {
			setLoading(false);
		}
	}

	if (!token) {
		return (
			<AuthShell icon={KeyRound} title={"Create your passkey"} description={"Use your fingerprint, face, or device PIN. Your passkey stays on your devices."}>
				<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
					This setup link is invalid or has expired.
				</p>
			</AuthShell>
		);
	}

	// A recovery link replaces the account's old sign-in methods; a first-run
	// link only adds the first passkey.
	const isRecovery = kind === "recovery" || kind === "admin";

	return (
		<AuthShell
			icon={KeyRound}
			title={email ? `Set up passkey sign-in for ${email}` : "Create your passkey"}
			description={
				email
					? isRecovery
						? "This passkey replaces the account's password, authenticator codes and recovery codes. Your other sessions are signed out."
						: "Create a passkey for this account. It can replace the password or act as a second step after it."
					: "Use your fingerprint, face, or device PIN. Your passkey stays on your devices."
			}
		>
			{checking ? (
				<p className="text-sm text-neutral-500">Loading...</p>
			) : linkError ? (
				<div className="space-y-4">
					<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
						{linkError}
					</p>
					<p className="text-sm leading-6 text-neutral-500">Ask an administrator for a new recovery link.</p>
				</div>
			) : (
				<form onSubmit={createPasskey} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="passkey-name">Passkey name (optional)</Label>
						<Input
							id="passkey-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={100}
							autoComplete="off"
							placeholder={"e.g. Work laptop"}
							autoFocus
						/>
						<p className="text-xs leading-5 text-neutral-500">Optional. If you leave it blank, we use the provider name or a dated label. You can rename it later.</p>
					</div>
					{error && (
						<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
							{error}
						</p>
					)}
					<Button type="submit" className="h-11 w-full rounded-full px-6 active:scale-[0.98]" disabled={loading}>
						{loading ? "Waiting for your device..." : "Create passkey"}
					</Button>
					<p className="text-xs leading-5 text-neutral-500">Your passkey stays with your password manager or security key. The browser controls its native name.</p>
				</form>
			)}
		</AuthShell>
	);
}
