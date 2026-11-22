import { NextResponse } from "next/server";
import { generateCaptcha, isCaptchaEnabled } from "@/lib/auth/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
	if (!isCaptchaEnabled()) {
		return NextResponse.json(
			{ enabled: false, svg: "", token: "" },
			{
				headers: {
					"Cache-Control": "no-store, max-age=0",
				},
			},
		);
	}
	const captcha = generateCaptcha();
	return NextResponse.json({ enabled: true, ...captcha }, {
		headers: {
			"Cache-Control": "no-store, max-age=0",
		},
	});
}

