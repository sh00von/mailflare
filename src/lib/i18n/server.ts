import { DEFAULT_LOCALE, createTranslator } from "./utils";
import type { Locale, Messages } from "./types";

/** English-only build: always returns the default locale. */
export async function getRequestLocale() {
	return DEFAULT_LOCALE;
}

/** English-only build: English catalog is bundled in memory. */
export async function loadServerMessages(_locale: Locale): Promise<Partial<Messages> | undefined> {
	return undefined;
}

// For server components and route handlers; client components use `useLanguage()`.
export async function getServerTranslator() {
	return createTranslator(DEFAULT_LOCALE);
}
