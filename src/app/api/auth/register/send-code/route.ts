import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { isDisposableEmail } from "@/lib/auth/disposable-emails";
import { generateVerificationCode, sendVerificationCodeEmail } from "@/lib/auth/email-verification";
import { z } from "zod";

const sendCodeSchema = z.object({
	email: z.string().trim().email("Please enter a valid email address"),
	captchaAnswer: z.string().optional(),
	captchaToken: z.string().optional(),
});

export async function POST(request: Request) {
	const env = getEnv();

	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json(
			{ error: "Too many verification requests. Please wait a minute and try again." },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	}

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (err) {
		const status = err instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid request payload" }, { status });
	}

	const parsed = sendCodeSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message || "Please provide a valid email address" },
			{ status: 400 },
		);
	}

	const { email, captchaAnswer, captchaToken } = parsed.data;

	if (captchaAnswer && captchaToken && !verifyCaptcha(captchaAnswer, captchaToken)) {
		return NextResponse.json({ error: "Invalid security code. Please try again." }, { status: 400 });
	}

	if (isDisposableEmail(email)) {
		return NextResponse.json(
			{ error: "Please provide a permanent, non-disposable email address for verification." },
			{ status: 400 },
		);
	}

	const code = generateVerificationCode();
	const result = await sendVerificationCodeEmail(env, email, code);

	if (!result.ok) {
		return NextResponse.json({ error: result.error || "Failed to send verification code" }, { status: 400 });
	}

	return NextResponse.json({ ok: true });
}
