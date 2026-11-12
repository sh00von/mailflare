"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
	WebAuthnAbortService,
} from "@simplewebauthn/browser";
import { AlertCircle, KeyRound, Mail, ShieldCheck } from "@/components/icons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthShell } from "@/components/auth/auth-shell";
import {
	AUTH_ERROR_CLASS,
	AUTH_INPUT_CLASS,
	AUTH_LABEL_CLASS,
	AUTH_PRIMARY_BUTTON_CLASS,
	AUTH_SECONDARY_BUTTON_CLASS,
	AUTH_TEXT_BUTTON_CLASS,
} from "@/components/auth/auth-ui-utils";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/auth/turnstile";
import { authErrorText } from "@/lib/auth/error-messages";
import { isPasskeyCancellation } from "@/lib/auth/webauthn/browser-errors";
import {
	finishPasskeyLogin,
	requestPasskeyLoginOptions,
	submitLogin,
	submitMfaCode,
	submitPasskeyLogin,
	submitPasskeyMfa,
} from "./utils";

export function LoginClient({ adding = false }: { adding?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  // Set once the password is accepted for an account with a second factor.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const runningRef = useRef(false);

  const finish = useCallback((redirect?: string) => {
    router.replace(redirect ?? "/inbox");
    router.refresh();
  }, [router]);

  // Offer saved passkeys through the browser's credential picker. This is
  // conditional mediation: it never opens a modal on its own.
  useEffect(() => {
    let cancelled = false;
    if (!browserSupportsWebAuthn()) return;
    void (async () => {
      try {
        if (!(await browserSupportsWebAuthnAutofill())) return;
        const options = await requestPasskeyLoginOptions();
        if (cancelled || !options.options || !options.ceremonyToken) return;
        const response = await startAuthentication({
          optionsJSON: options.options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
          useBrowserAutofill: true,
        });
        if (cancelled || runningRef.current) return;
        runningRef.current = true;
        setLoading(true);
        const { ok, data } = await finishPasskeyLogin(options, response);
        if (ok) finish(data.redirect);
      } catch {
        // No credential chosen, a cancelled prompt, or an unavailable
        // autofill surface is not an error on page load.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      WebAuthnAbortService.cancelCeremony();
    };
  }, [finish]);

  async function onPasskey() {
    if (!browserSupportsWebAuthn()) {
      setError("This browser does not support passkeys");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await submitPasskeyLogin();
      if (!ok) {
        setError(authErrorText(data.code, "Passkey sign-in failed"));
        return;
      }
      finish(data.redirect);
    } catch (err) {
      setError(isPasskeyCancellation(err) ? "The passkey prompt was cancelled or timed out." : "Passkey sign-in is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function onPasskeyMfa() {
    if (!challengeToken) return;
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await submitPasskeyMfa(challengeToken);
      if (!ok) {
        if (data.code === "passkey_expired") {
          setChallengeToken(null);
          setMethods([]);
        }
        setError(authErrorText(data.code, "Passkey sign-in failed"));
        return;
      }
      finish(data.redirect);
    } catch (err) {
      setError(isPasskeyCancellation(err) ? "The passkey prompt was cancelled or timed out." : "Passkey sign-in is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data } = await submitLogin(new FormData(e.currentTarget));
      if (!ok) {
        setError(authErrorText(data.code, "Login failed"));
        setTurnstileReset((value) => value + 1);
        return;
      }
      if (data.mfaRequired && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setMethods(data.methods ?? []);
        return;
      }
      finish(data.redirect);
    } catch (error) {
      setError(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Login timed out. Please try again."
          : "Unable to reach the login service. Please try again.",
      );
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challengeToken) return;
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await submitMfaCode(challengeToken, code);
      if (!ok) {
        if (data.code === "passkey_expired") {
          setChallengeToken(null);
          setMethods([]);
          setCode("");
        }
        setError(authErrorText(data.code, "That code did not match"));
        return;
      }
      finish(data.redirect);
    } catch {
      setError("Unable to reach the login service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (challengeToken) {
    // An empty method list means the server did not say, so keep the code
    // field: it is the only method that can still work.
    const hasCodeMethods = methods.length === 0 || methods.includes("totp") || methods.includes("recovery");
    const canUsePasskey = methods.includes("passkey");
    const description = canUsePasskey
      ? hasCodeMethods
        ? "Confirm with your passkey, or enter a code from your authenticator app."
        : "Use your passkey to finish signing in."
      : methods.length === 0 || methods.includes("recovery")
        ? "Enter the code from your authenticator app, or one of its recovery codes."
        : "Enter the code from your authenticator app.";
    const codeLabel = methods.includes("recovery") ? "Authenticator code or recovery code" : "Authenticator code";
    return (
      <AuthShell
        icon={ShieldCheck}
        title={"2-Step Verification"}
        description={description}
      >
        <form onSubmit={onSubmitCode} className="space-y-6">
          {canUsePasskey && (
            <Button
              type="button"
              className={`${AUTH_SECONDARY_BUTTON_CLASS} h-12 w-full`}
              disabled={loading}
              onClick={() => void onPasskeyMfa()}
            >
              <KeyRound className="h-4 w-4" />
              Use your passkey
            </Button>
          )}
          {canUsePasskey && hasCodeMethods && <AuthDivider label="or enter a code" />}
          {hasCodeMethods && (
            <div className="space-y-2">
              <Label htmlFor="code" className={AUTH_LABEL_CLASS}>{codeLabel}</Label>
              <Input
                id="code"
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                placeholder={"123 456 or abcde-fghjk"}
                className={`${AUTH_INPUT_CLASS} tracking-wide`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "mfa-error" : undefined}
                required={hasCodeMethods}
              />
            </div>
          )}
          {error && (
            <p id="mfa-error" role="alert" className={AUTH_ERROR_CLASS}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          {!hasCodeMethods && (
            <p className="text-sm leading-6 text-neutral-500">Lost every passkey? Ask an administrator for a recovery link. If you are the only administrator, use the server recovery procedure.</p>
          )}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className={AUTH_TEXT_BUTTON_CLASS}
              onClick={() => {
                setChallengeToken(null);
                setMethods([]);
                setCode("");
                setError(null);
              }}
            >
              Back to sign in
            </button>
            {hasCodeMethods && (
              <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            )}
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={Mail}
      title={adding ? "Add another account" : "Sign in"}
      description={
        adding
          ? "Sign in to another account. You can switch between accounts from the account menu."
          : "Use your work email to continue to your inbox."
      }
    >
      <form method="post" onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className={AUTH_LABEL_CLASS}>Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username webauthn"
            placeholder="you@yourcompany.com"
            className={AUTH_INPUT_CLASS}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={AUTH_LABEL_CLASS}>Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
          <Link href="/forgot-password" className="inline-block pt-1 text-sm font-medium text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <p id="login-error" role="alert" className={AUTH_ERROR_CLASS}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <TurnstileField resetSignal={turnstileReset} />
        <div className="flex items-center justify-between gap-3 pt-2">
          {adding ? (
            <span />
          ) : (
            <Link href="/register" className={AUTH_TEXT_BUTTON_CLASS}>
              Create account
            </Link>
          )}
          <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        <AuthDivider label="or" />
        <Button
          type="button"
          className={`${AUTH_SECONDARY_BUTTON_CLASS} h-12 w-full`}
          disabled={loading}
          onClick={() => void onPasskey()}
        >
          <KeyRound className="h-4 w-4" />
          Sign in with a passkey
        </Button>
      </form>
    </AuthShell>
  );
}
