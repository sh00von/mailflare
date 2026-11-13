import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CAPTCHA_LENGTH = 5;
const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Server secret fallback in case an explicit CAPTCHA_SECRET is not configured
let runtimeSecret = process.env.CAPTCHA_SECRET || process.env.SESSION_SECRET;
if (!runtimeSecret) {
	runtimeSecret = randomBytes(32).toString("hex");
}

function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomColor(): string {
	const colors = [
		"#1e293b", // slate-800
		"#334155", // slate-700
		"#0f172a", // slate-900
		"#312e81", // indigo-900
		"#1e1b4b", // indigo-950
		"#3730a3", // indigo-800
		"#1e3a5f", // deep navy
	];
	return colors[getRandomInt(0, colors.length - 1)];
}

function generateRandomText(length: number): string {
	let text = "";
	for (let i = 0; i < length; i++) {
		text += CAPTCHA_CHARS[getRandomInt(0, CAPTCHA_CHARS.length - 1)];
	}
	return text;
}

export type CaptchaChallenge = {
	svg: string;
	token: string;
};

/**
 * Generates an alphanumeric distorted SVG captcha and a signed verification token.
 */
export function generateCaptcha(): CaptchaChallenge {
	const text = generateRandomText(CAPTCHA_LENGTH);
	const timestamp = Date.now().toString();
	const nonce = randomBytes(8).toString("hex");

	const signature = createHmac("sha256", runtimeSecret!)
		.update(`${text}:${timestamp}:${nonce}`)
		.digest("hex");

	const token = `${timestamp}.${nonce}.${signature}`;

	const width = 150;
	const height = 44;

	// Build SVG with noise lines, dots, and distorted character glyphs
	const dots: string[] = [];
	for (let i = 0; i < 28; i++) {
		const cx = getRandomInt(4, width - 4);
		const cy = getRandomInt(4, height - 4);
		const r = getRandomInt(1, 2);
		const opacity = (getRandomInt(15, 40) / 100).toFixed(2);
		dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#64748b" opacity="${opacity}" />`);
	}

	const lines: string[] = [];
	for (let i = 0; i < 3; i++) {
		const startX = getRandomInt(0, 20);
		const startY = getRandomInt(8, height - 8);
		const cp1X = getRandomInt(30, 60);
		const cp1Y = getRandomInt(4, height - 4);
		const cp2X = getRandomInt(80, 110);
		const cp2Y = getRandomInt(4, height - 4);
		const endX = getRandomInt(width - 25, width);
		const endY = getRandomInt(8, height - 8);
		const strokeWidth = (getRandomInt(10, 18) / 10).toFixed(1);
		const strokeColor = getRandomColor();
		lines.push(
			`<path d="M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" opacity="0.4" />`
		);
	}

	const charElements: string[] = [];
	const charSpacing = width / (CAPTCHA_LENGTH + 0.8);

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const x = Math.round(18 + i * charSpacing + getRandomInt(-2, 2));
		const y = Math.round(30 + getRandomInt(-3, 3));
		const rotate = getRandomInt(-18, 18);
		const fontSize = getRandomInt(22, 26);
		const color = getRandomColor();

		charElements.push(
			`<text x="${x}" y="${y}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`
		);
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="select-none rounded-lg border border-neutral-200/80 bg-neutral-50/90 shadow-2xs">
		<rect width="100%" height="100%" fill="#f8fafc" />
		${dots.join("\n\t\t")}
		${lines.join("\n\t\t")}
		${charElements.join("\n\t\t")}
	</svg>`;

	return { svg, token };
}

// In-memory cache of redeemed nonces to guarantee strict single-use (anti-replay)
const redeemedNonces = new Map<string, number>();

function purgeExpiredNonces(now: number): void {
	for (const [nonce, expiresAt] of redeemedNonces.entries()) {
		if (expiresAt <= now) {
			redeemedNonces.delete(nonce);
		}
	}
}

/**
 * Validates a submitted captcha answer against the signed token.
 * Case-insensitive, single-use anti-replay (expires in 5 minutes and immediately burns the nonce).
 */
export function verifyCaptcha(answer: unknown, token: unknown): boolean {
	if (typeof answer !== "string" || typeof token !== "string") {
		return false;
	}

	const cleanAnswer = answer.trim().toUpperCase();
	if (cleanAnswer.length !== CAPTCHA_LENGTH) {
		return false;
	}

	const parts = token.split(".");
	if (parts.length !== 3) {
		return false;
	}

	const [timestampStr, nonce, signature] = parts;
	const timestamp = Number.parseInt(timestampStr, 10);
	if (Number.isNaN(timestamp)) {
		return false;
	}

	// Verify expiration
	const now = Date.now();
	if (now - timestamp > CAPTCHA_EXPIRY_MS || timestamp > now + 30_000) {
		return false;
	}

	// Check if this nonce has already been consumed (replay protection)
	if (redeemedNonces.has(nonce)) {
		return false;
	}

	// Compute expected HMAC signature
	const expectedSignature = createHmac("sha256", runtimeSecret!)
		.update(`${cleanAnswer}:${timestampStr}:${nonce}`)
		.digest("hex");

	let isValid = false;
	try {
		isValid = timingSafeEqual(
			Buffer.from(signature, "hex"),
			Buffer.from(expectedSignature, "hex")
		);
	} catch {
		return false;
	}

	if (!isValid) {
		return false;
	}

	// Burn nonce immediately so it cannot be replayed within the 5-minute window
	redeemedNonces.set(nonce, timestamp + CAPTCHA_EXPIRY_MS);

	// Periodic purge of expired nonces to prevent unbounded memory growth
	if (redeemedNonces.size > 200) {
		purgeExpiredNonces(now);
	}

	return true;
}

