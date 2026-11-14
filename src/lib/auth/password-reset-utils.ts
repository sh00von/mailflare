export function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail(
	{ email, appName, link, minutes }: { email: string; appName: string; link: string; minutes: number },
): { subject: string; text: string; html: string } {
	const brandName = appName?.trim() || "Mailflare";
	const subject = `Reset your ${brandName} password`;
	const safeEmail = escapeHtml(email);
	const safeAppName = escapeHtml(brandName);
	const safeLink = escapeHtml(link);

	const text = [
		`Someone requested a password reset for ${email} on ${brandName}.`,
		"",
		`Open this link within ${minutes} minutes to choose a new password:`,
		link,
		"",
		"If you did not request this, you can safely ignore this message; your account password will remain unchanged.",
	].join("\n");

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #0f172a; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .brand { font-size: 20px; font-weight: 700; color: #2563eb; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 9999px; }
    .notice { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
    .link-fallback { word-break: break-all; color: #2563eb; font-size: 11px; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${safeAppName}</div>
    <div class="title">Reset your password</div>
    <div class="desc">
      We received a request to reset the password for <strong>${safeEmail}</strong>. Click the button below to set a new password.
    </div>
    <div class="btn-container">
      <a href="${safeLink}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <div class="desc" style="font-size: 13px;">
      This link is valid for <strong>${minutes} minutes</strong>. If you did not make this request, you can safely disregard this email; your password will stay the same.
    </div>
    <div class="notice">
      If the button above does not work, copy and paste this link into your web browser:<br>
      <a href="${safeLink}" class="link-fallback">${safeLink}</a>
    </div>
    <div class="footer">Sent by ${safeAppName} • Secure Email Platform</div>
  </div>
</body>
</html>
	`.trim();

	return { subject, text, html };
}
