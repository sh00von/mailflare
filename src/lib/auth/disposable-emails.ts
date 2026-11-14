/**
 * Curated disposable & temporary email domain blocklist.
 * Powered by `@visulima/disposable-email-domains`
 */

import { isDisposableEmail as visulimaIsDisposableEmail } from "@visulima/disposable-email-domains";

/**
 * Returns true if the provided email address belongs to a known disposable or temporary email provider.
 */
export function isDisposableEmail(email?: string | null): boolean {
	if (!email) return false;
	const trimmed = email.trim().toLowerCase();
	try {
		return visulimaIsDisposableEmail(trimmed);
	} catch {
		return false;
	}
}
