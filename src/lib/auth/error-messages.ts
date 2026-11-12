import type { AuthErrorCode } from "./error-codes";

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
	rate_limited: "Too many attempts. Try again shortly.",
	passkey_unavailable: "Passkey sign-in is unavailable.",
	passkey_expired: "This passkey attempt expired. Start again.",
	passkey_invalid: "This passkey could not be verified.",
	passkey_not_found: "That passkey is no longer registered.",
	passkey_already_registered: "This passkey is already registered.",
	passkey_disabled: "This account is disabled.",
	passkey_counter_stale: "This passkey could not be verified.",
	passkey_origin: "Passkeys need a trusted HTTPS address for this installation.",
	setup_invalid: "This setup link is invalid or has expired.",
	session_expired: "Your session has expired. Sign in again.",
	verification_required: "Confirm your identity before continuing.",
	verification_failed: "Verification failed. Try again.",
	last_method: "Keep another way to sign in before removing this one.",
	passkey_only_password: "This account uses passkeys only. Send it a recovery link instead.",
	account_disabled: "This account is disabled.",
	passkey_cancelled: "The passkey prompt was cancelled or timed out.",
	code_mismatch: "That code did not match.",
	invalid_credentials: "Invalid email or password.",
	password_incorrect: "Password is incorrect.",
	invalid_request: "Invalid request.",
	action_conflict: "Another security change is in progress. Refresh and try again.",
	recovery_cleanup_failed: "The new passkey was created, but older sign-in methods could not be removed. Sign in with the new passkey, then review Security settings.",
};

/** Describe a server error code, falling back to a call-site message. */
export function authErrorText(code: unknown, fallback: string): string {
	if (typeof code === "string" && code in ERROR_MESSAGES) return ERROR_MESSAGES[code as AuthErrorCode];
	return fallback;
}
