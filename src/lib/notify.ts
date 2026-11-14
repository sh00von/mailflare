"use client";

import type { ReactElement } from "react";
import { toast, type ExternalToast } from "sonner";
import { DEFAULT_ERROR_MESSAGE, toastIdFor, toUserMessage } from "@/lib/notify-utils";
import type { NotifyOptions, NotifyResponseMessages, NotifyResponseResult } from "@/lib/notify-types";

const SHORT_MS = 4000;
const LONG_MS = 8000;

function toSonner(type: string, text: string, options: NotifyOptions = {}, defaults: ExternalToast = {}): ExternalToast {
	const { action, ...rest } = options;
	return {
		...defaults,
		id: options.id ?? toastIdFor(type, text),
		// Anything the user can act on gets the longer window.
		duration: options.duration ?? (action ? LONG_MS : defaults.duration ?? SHORT_MS),
		description: rest.description,
		...(action ? { action: { label: action.label, onClick: () => void action.onClick() } } : {}),
	};
}

/**
 * The only way the app shows toasts. Field validation stays inline next to the field; results of actions
 * (saved, moved, deleted, failed) go through here so every toast has the same look, timing and wording rules.
 */
export const notify = {
	success(message: string, options?: NotifyOptions) {
		return toast.success(message, toSonner("success", message, options));
	},

	info(message: string, options?: NotifyOptions) {
		return toast.info(message, toSonner("info", message, options));
	},

	warning(message: string, options?: NotifyOptions) {
		return toast.warning(message, toSonner("warning", message, options, { duration: LONG_MS }));
	},

	/**
	 * A string is shown as written (it is the caller's own copy). Anything else (an Error, an API body) is run
	 * through `toUserMessage`, so technical text is replaced by `fallback`.
	 */
	error(input: unknown, fallback?: string, options?: NotifyOptions) {
		const message = typeof input === "string" && fallback === undefined ? input : toUserMessage(input, fallback ?? DEFAULT_ERROR_MESSAGE);
		return toast.error(message, toSonner("error", message, options, { duration: LONG_MS, closeButton: true }));
	},

	/** Stays until replaced: pass the returned id to success/error, or call `dismiss`. */
	loading(message: string, options?: NotifyOptions) {
		return toast.loading(message, toSonner("loading", message, options, { duration: Infinity }));
	},

	promise<T>(promise: Promise<T>, messages: { loading: string; success: string | ((value: T) => string); error: string }) {
		toast.promise(promise, {
			loading: messages.loading,
			success: messages.success,
			error: (error: unknown) => toUserMessage(error, messages.error),
		});
		return promise;
	},

	/** For bespoke content such as the composer's undo-send countdown; keep the card look inside `render`. */
	custom(render: (id: string | number) => ReactElement, options: { id: string | number; duration?: number }) {
		return toast.custom(render, { id: options.id, duration: options.duration ?? SHORT_MS, unstyled: true });
	},

	dismiss(id?: string | number) {
		toast.dismiss(id);
	},

	/**
	 * Toast the outcome of an API call: `messages.success` when OK, otherwise the server's `{ error }` (or the
	 * fallback when it is missing or technical). Returns the parsed body so callers can keep using it.
	 */
	async fromResponse<T = Record<string, unknown>>(response: Response, messages: NotifyResponseMessages): Promise<NotifyResponseResult<T>> {
		const data = (await response.json().catch(() => null)) as T | null;
		if (response.ok) {
			if (messages.success) notify.success(messages.success);
			return { ok: true, status: response.status, data: data as T };
		}
		const message = toUserMessage(data, messages.error, response.status);
		toast.error(message, toSonner("error", message, {}, { duration: LONG_MS, closeButton: true }));
		return { ok: false, status: response.status, data };
	},
};
