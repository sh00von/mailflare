import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { webauthnChallenges } from "@/db/schema";
import { newId } from "@/lib/ids";
import { hashSessionToken } from "@/lib/auth/session";
import { sendSystemEmail } from "@/lib/email/system-mail";
import { getBranding } from "@/lib/branding/service";
import { isDisposableEmail } from "@/lib/auth/disposable-emails";

const CODE_EXPIRY_MINUTES = 15;

/**
 * Generates a cryptographically random 6-digit numeric OTP code.
 */
export function generateVerificationCode(): string {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	const code = (100000 + (array[0] % 900000)).toString();
	return code;
}

/**
 * Sends a 6-digit verification code email to the specified recovery email.
 */
export async function sendVerificationCodeEmail(
	env: CloudflareEnv,
	email: string,
	code: string,
): Promise<{ ok: boolean; error?: string }> {
	const cleanEmail = email.trim().toLowerCase();

	if (isDisposableEmail(cleanEmail)) {
		return { ok: false, error: "Disposable email addresses cannot be used for verification." };
	}

	const db = getDb(env);
	const ceremonyHash = await hashSessionToken(`${cleanEmail}:${code}:${Date.now()}`);

	// Invalidate any existing unused codes for this email
	await db
		.delete(webauthnChallenges)
		.where(
			and(
				eq(webauthnChallenges.purpose, "register"),
				eq(webauthnChallenges.bindingHash, cleanEmail),
			),
		);

	// Insert new challenge
	await db.insert(webauthnChallenges).values({
		id: newId("emv"),
		ceremonyHash,
		challenge: code,
		purpose: "register",
		bindingHash: cleanEmail,
		expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
	});

	const { appName } = await getBranding(env);
	const subject = `${code} is your ${appName || "Mailflare"} verification code`;

	const text = `Your verification code is: ${code}\n\nUse this code to verify your recovery email address and activate your free trial. This code expires in ${CODE_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; color: #111827; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6; }
    .brand { font-size: 20px; font-weight: 700; color: #1e40af; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 600; color: #111827; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #6b7280; line-height: 1.5; margin-bottom: 28px; }
    .code-box { background: #eff6ff; border: 1.5px dashed #bfdbfe; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 28px; }
    .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }
    .footer { font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${appName || "Mailflare"}</div>
    <div class="title">Verify your email address</div>
    <div class="desc">Enter the 6-digit verification code below on the registration screen to complete setup and activate your 7-day free trial.</div>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <div class="desc" style="font-size: 13px;">This code expires in <strong>${CODE_EXPIRY_MINUTES} minutes</strong>. If you did not create an account, you can safely disregard this email.</div>
    <div class="footer">Sent by ${appName || "Mailflare"} • Secure Business Email</div>
  </div>
</body>
</html>
	`.trim();

	if (process.env.NODE_ENV === "development") {
		console.log(`[Verification Code for ${cleanEmail}]: ${code}`);
	}

	try {
		await sendSystemEmail(env, {
			to: cleanEmail,
			subject,
			text,
			html,
		});
	} catch (err) {
		console.warn("Could not dispatch verification email via system sender:", err);
	}

	return { ok: true };
}

/**
 * Validates a 6-digit verification code against the stored challenge for the email.
 * Marks the challenge as used if valid.
 */
export async function verifyRegistrationCode(
	env: CloudflareEnv,
	email: string,
	code: string,
): Promise<{ ok: boolean; error?: string }> {
	const cleanEmail = email.trim().toLowerCase();
	const cleanCode = code.trim();

	if (!cleanCode || cleanCode.length !== 6) {
		return { ok: false, error: "Please enter a valid 6-digit verification code." };
	}

	const db = getDb(env);
	const [challenge] = await db
		.select()
		.from(webauthnChallenges)
		.where(
			and(
				eq(webauthnChallenges.purpose, "register"),
				eq(webauthnChallenges.bindingHash, cleanEmail),
				eq(webauthnChallenges.challenge, cleanCode),
				gt(webauthnChallenges.expiresAt, new Date()),
				isNull(webauthnChallenges.usedAt),
			),
		)
		.limit(1);

	if (!challenge) {
		return {
			ok: false,
			error: "Invalid or expired verification code. Please check the code or request a new one.",
		};
	}

	// Mark challenge as used
	await db
		.update(webauthnChallenges)
		.set({ usedAt: new Date() })
		.where(eq(webauthnChallenges.id, challenge.id));

	return { ok: true };
}
