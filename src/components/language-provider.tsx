"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, createTranslator, getDirection, loadMessages, resolveLocale, serializeLocaleCookie } from "@/lib/i18n/utils";
import type { Locale, Messages } from "@/lib/i18n/types";
import type { LanguageState } from "./language-provider-types";

const LanguageContext = createContext<LanguageState>({
	locale: DEFAULT_LOCALE,
	setLocale: () => undefined,
	t: createTranslator(DEFAULT_LOCALE),
});

type Active = { locale: Locale; messages?: Partial<Messages> };

/**
 * `initialMessages` is the catalog for `initialLocale`, loaded on the server so the first render is already
 * translated. English needs none; it is bundled. Other catalogs load on demand when the language changes.
 */
export function LanguageProvider({ initialLocale, initialMessages, children }: { initialLocale: Locale; initialMessages?: Partial<Messages>; children: ReactNode }) {
	const [active, setActive] = useState<Active>({ locale: initialLocale, messages: initialMessages });
	const latestRequest = useRef(0);

	const setLocale = useCallback((_next: Locale) => {
		// English-only build: locale switching is disabled.
	}, []);

	const value = useMemo<LanguageState>(
		() => ({ locale: active.locale, setLocale, t: createTranslator(active.locale, active.messages) }),
		[active, setLocale],
	);

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	return useContext(LanguageContext);
}
