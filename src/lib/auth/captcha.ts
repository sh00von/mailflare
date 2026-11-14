import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// No look-alike pairs (0/O, 1/I, 2/Z, 5/S, 6/G, 8/B), which a stroke font makes ambiguous.
const CAPTCHA_CHARS = "3479ACDEFHJKLMNPQRTUVWXY";
const CAPTCHA_LENGTH = 5;
const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Server secret fallback in case an explicit CAPTCHA_SECRET is not configured
let runtimeSecret = process.env.CAPTCHA_SECRET || process.env.SESSION_SECRET;
if (!runtimeSecret) {
	runtimeSecret = randomBytes(32).toString("hex");
}

type Point = [number, number];
type Glyph = Point[][];

/**
 * A stroke font on a 4x6 grid. Characters are drawn as path geometry, never as text, so the answer
 * cannot be read out of the SVG markup; every glyph is jittered, rotated and merged with decoy strokes.
 */
const GLYPHS: Record<string, Glyph> = {
	"3": [[[0, 0], [4, 0], [2, 2.5], [3.5, 3], [4, 4.5], [3, 6], [1, 6], [0, 5]]],
	"4": [[[3, 6], [3, 0], [0, 4], [4, 4]]],
	"7": [[[0, 0], [4, 0], [1.5, 6]]],
	"9": [[[4, 2], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [0.5, 6]]],
	A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.5], [3, 3.5]]],
	C: [[[4, 1], [3, 0], [1, 0], [0, 1.5], [0, 4.5], [1, 6], [3, 6], [4, 5]]],
	D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
	E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
	F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
	H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
	J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
	K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.3, 2.7], [4, 6]]],
	L: [[[0, 0], [0, 6], [4, 6]]],
	M: [[[0, 6], [0, 0], [2, 3.5], [4, 0], [4, 6]]],
	N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
	P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
	Q: [[[1, 0], [3, 0], [4, 1.5], [4, 4.5], [3, 6], [1, 6], [0, 4.5], [0, 1.5], [1, 0]], [[2.5, 4.5], [4, 6.5]]],
	R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
	T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
	U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
	V: [[[0, 0], [2, 6], [4, 0]]],
	W: [[[0, 0], [1, 6], [2, 2.5], [3, 6], [4, 0]]],
	X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
	Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
};

/** Uniform float in [min, max) from the CSPRNG. */
function randomFloat(min: number, max: number): number {
	return min + (randomInt(0, 1_000_000) / 1_000_000) * (max - min);
}

function getRandomColor(): string {
	const colors = ["#1e293b", "#334155", "#0f172a", "#312e81", "#1e1b4b", "#3730a3", "#1e3a5f"];
	return colors[randomInt(0, colors.length)];
}

function generateRandomText(length: number): string {
	let text = "";
	for (let i = 0; i < length; i++) {
		text += CAPTCHA_CHARS[randomInt(0, CAPTCHA_CHARS.length)];
	}
	return text;
}

function shuffle<T>(items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

const n = (value: number) => value.toFixed(1);

function polylineToPath(points: Point[]): string {
	return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${n(x)} ${n(y)}`).join("");
}

export type CaptchaChallenge = {
	svg: string;
	token: string;
};

/**
 * Generates a distorted captcha drawn from stroke paths and a signed verification token.
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

	const dots: string[] = [];
	for (let i = 0; i < 28; i++) {
		dots.push(`<circle cx="${randomInt(4, width - 4)}" cy="${randomInt(4, height - 4)}" r="${randomInt(1, 3)}" fill="#64748b" opacity="${n(randomFloat(0.15, 0.4))}"/>`);
	}

	// Glyph strokes and decoy strokes share one path in shuffled order, so the markup does not
	// segment characters or say which strokes belong to the answer.
	const strokes: string[] = [];
	const slot = (width - 16) / CAPTCHA_LENGTH;
	for (let i = 0; i < text.length; i++) {
		const glyph = GLYPHS[text[i]];
		const scaleX = randomFloat(4.3, 4.8);
		const scaleY = randomFloat(4.5, 4.9);
		const angle = (randomFloat(-10, 10) * Math.PI) / 180;
		const originX = 8 + i * slot + slot / 2 + randomFloat(-2, 2);
		const originY = height / 2 + randomFloat(-2, 2);
		const skew = randomFloat(-0.15, 0.15);
		for (const polyline of glyph) {
			strokes.push(polylineToPath(polyline.map(([gx, gy]) => {
				const x = (gx - 2 + skew * (gy - 3)) * scaleX;
				const y = (gy - 3) * scaleY;
				return [
					originX + x * Math.cos(angle) - y * Math.sin(angle) + randomFloat(-0.35, 0.35),
					originY + x * Math.sin(angle) + y * Math.cos(angle) + randomFloat(-0.35, 0.35),
				];
			})));
		}
	}
	{
		const y0 = randomFloat(10, height - 10);
		strokes.push(`M${n(randomFloat(0, 12))} ${n(y0)}C${n(randomFloat(35, 60))} ${n(randomFloat(2, height - 2))} ${n(randomFloat(85, 115))} ${n(randomFloat(2, height - 2))} ${n(randomFloat(width - 12, width))} ${n(randomFloat(10, height - 10))}`);
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="select-none rounded-lg border border-neutral-200/80 bg-neutral-50/90 shadow-2xs"><rect width="100%" height="100%" fill="#f8fafc"/>${dots.join("")}<path d="${shuffle(strokes).join("")}" stroke="${getRandomColor()}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

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

