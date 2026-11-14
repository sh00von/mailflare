import type { ReactNode } from "react";

export type NotifyAction = {
	label: string;
	onClick: () => void | Promise<void>;
};

export type NotifyOptions = {
	/** Second line under the title. */
	description?: ReactNode;
	action?: NotifyAction;
	/** Replace a specific toast instead of the default type + text id. */
	id?: string | number;
	/** Milliseconds; `Infinity` keeps it until dismissed. */
	duration?: number;
};

export type NotifyResponseMessages = {
	/** Shown when the response is OK; omit for no success toast. */
	success?: string;
	/** Fallback when the server's error is missing or technical. */
	error: string;
};

export type NotifyResponseResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; data: T | null };
