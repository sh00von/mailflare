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
import { KeyRound, Mail, ShieldCheck } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
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
        title={"Two-factor authentication"}
        description={description}
      >
        <form onSubmit={onSubmitCode} className="space-y-5">
          {canUsePasskey && (
            <div className="space-y-4">
              <Button
                type="button"
                className="h-11 w-full rounded-full"
                disabled={loading}
                onClick={() => void onPasskeyMfa()}
              >
                <KeyRound className="h-4 w-4" />
                Use a passkey
              </Button>
              {hasCodeMethods && (
                <p className="text-center text-xs uppercase tracking-wide text-neutral-400">Or use a code</p>
              )}
            </div>
          )}
          {hasCodeMethods && (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">{codeLabel}</Label>
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
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "mfa-error" : undefined}
                  required={hasCodeMethods}
                />
              </div>
              <Button type="submit" className="h-11 w-full rounded-full px-6 active:scale-[0.98]" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </>
          )}
          {error && (
            <p id="mfa-error" role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {!hasCodeMethods && (
            <p className="text-xs leading-5 text-neutral-500">Lost every passkey? Ask an administrator for a recovery link. If you are the only administrator, use the server recovery procedure.</p>
          )}
          <button
            type="button"
            className="w-full text-center text-sm text-neutral-500 hover:text-neutral-800"
            onClick={() => {
              setChallengeToken(null);
              setMethods([]);
              setCode("");
              setError(null);
            }}
          >
            Back to sign in
          </button>
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
          : "Open your mailbox and continue from the same inbox workspace."
      }
    >
      <form method="post" onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username webauthn"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <TurnstileField resetSignal={turnstileReset} />
        <Button
          type="submit"
          className="h-11 w-full rounded-full px-6 active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        {!adding && (
          <p className="text-center text-sm text-neutral-600">
            Don&apos;t have a workspace?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Create account
            </Link>
          </p>
        )}
        <p className="text-center text-xs uppercase tracking-wide text-neutral-400">or</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
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
