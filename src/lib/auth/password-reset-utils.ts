
export function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail(
	{ email, appName, link, minutes }: { email: string; appName: string; link: string; minutes: number },
): { subject: string; text: string; html: string } {
	const ignore = "If that was not you, you can ignore this message; the password stays as it is.";
	return {
		subject: `Reset your ${appName} password`,
		text: [
			`Someone asked to reset the password for ${email} on ${appName}.`,
			"",
			`Open this link within ${minutes} minutes to choose a new password:`,
			link,
			"",
			ignore,
		].join("\n"),
		html: `<p>${`Someone asked to reset the password for ${`<b>${escapeHtml(email)}</b>`} on ${escapeHtml(appName)}.`}</p><p>${escapeHtml(`Open this link within ${minutes} minutes to choose a new password:`)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>${escapeHtml(ignore)}</p>`,
	};
}
