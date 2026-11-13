"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AlertCircle, Mail, ShieldCheck } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import {
	AUTH_ERROR_CLASS,
	AUTH_INPUT_CLASS,
	AUTH_LABEL_CLASS,
	AUTH_PRIMARY_BUTTON_CLASS,
	AUTH_TEXT_BUTTON_CLASS,
} from "@/components/auth/auth-ui-utils";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CaptchaField } from "@/components/auth/captcha-field";
import { authErrorText } from "@/lib/auth/error-messages";
import {
	submitLogin,
	submitMfaCode,
} from "./utils";

export function LoginClient({ adding = false }: { adding?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaReset, setCaptchaReset] = useState(0);
  // Set once the password is accepted for an account with a second factor.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [code, setCode] = useState("");

  const finish = useCallback((redirect?: string) => {
    router.replace(redirect ?? "/mail/inbox");
    router.refresh();
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data } = await submitLogin(new FormData(e.currentTarget));
      if (!ok) {
        setError(authErrorText(data.code, "Login failed"));
        setCaptchaReset((value) => value + 1);
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
      setCaptchaReset((value) => value + 1);
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
    const codeLabel = methods.includes("recovery") ? "Authenticator code or recovery code" : "Authenticator code";
    const description = methods.includes("recovery")
      ? "Enter the code from your authenticator app, or one of its recovery codes."
      : "Enter the code from your authenticator app.";
    return (
      <AuthShell
        icon={ShieldCheck}
        title={"2-Step Verification"}
        description={description}
      >
        <form onSubmit={onSubmitCode} className="space-y-6">
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
              required
            />
          </div>
          {error && (
            <p id="mfa-error" role="alert" className={AUTH_ERROR_CLASS}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
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
            <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
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
            autoComplete="username"
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
        <CaptchaField resetSignal={captchaReset} />
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
      </form>
    </AuthShell>
  );
}
