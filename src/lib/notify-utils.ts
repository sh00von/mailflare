export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection.";
export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Try again.";

const STATUS_MESSAGES: Record<number, string> = {
	403: "You don't have permission to do that.",
	413: "That's too large.",
	429: "Too many attempts. Wait a minute and try again.",
};

// Text that came from code, a driver or the runtime rather than from a message written for people.
const TECHNICAL = /failed query|sqlite|postgres|mysql|syntax error|econn|enotfound|etimedout|internal server error|\bundefined\b|\bnull\b|unexpected token|is not a function|cannot read propert|\bat [\w.<>]+ \(/i;
const NETWORK = /failed to fetch|load failed|networkerror|network request failed|fetch failed/i;

/** Whether a string reads as a sentence meant for a person. */
export function isUserFacingText(text: string): boolean {
	const value = text.trim();
	return value.length >= 3 && value.length <= 200 && !/[\r\n]/.test(value) && !TECHNICAL.test(value);
}

function firstText(input: unknown, depth = 0): string | null {
	if (depth > 5 || input == null) return null;
	if (typeof input === "string") return input;
	if (input instanceof Error) return input.message;
	if (Array.isArray(input)) {
		for (const item of input) {
			const found = firstText(item, depth + 1);
			if (found) return found;
		}
		return null;
	}
	if (typeof input === "object") {
		const record = input as Record<string, unknown>;
		// `{ error: ... }` from API routes, and zod's `flatten()`: { formErrors: [], fieldErrors: { name: [] } }.
		if ("error" in record) return firstText(record.error, depth + 1);
		if ("message" in record) return firstText(record.message, depth + 1);
		if ("formErrors" in record || "fieldErrors" in record) {
			return firstText(record.formErrors, depth + 1) ?? firstText(Object.values((record.fieldErrors as Record<string, unknown>) ?? {}), depth + 1);
		}
	}
	return null;
}

export function isNetworkError(input: unknown): boolean {
	const text = input instanceof Error ? `${input.name} ${input.message}` : typeof input === "string" ? input : "";
	return NETWORK.test(text);
}

/**
 * The text an error toast shows: the server's or thrown message when it is written for people, otherwise a
 * status-specific line, otherwise the caller's fallback. Network failures always get the connection message.
 */
export function toUserMessage(input: unknown, fallback = DEFAULT_ERROR_MESSAGE, status?: number): string {
	if (isNetworkError(input)) return NETWORK_ERROR_MESSAGE;
	const text = firstText(input);
	if (text && isUserFacingText(text)) return text.trim();
	if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
	return fallback;
}

/** Stable id so the same message replaces itself instead of stacking (e.g. a bulk action firing per item). */
export function toastIdFor(type: string, text: string): string {
	return `${type}:${text}`;
}
