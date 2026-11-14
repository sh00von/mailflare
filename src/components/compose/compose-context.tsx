"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { notify } from "@/lib/notify";
import { ComposeNoticeToast } from "./compose-notice-toast";
import type { SendNoticeParts } from "./send-notice-utils";

/** One slot: a new send notice replaces the previous one, as the composer expects. */
const COMPOSE_NOTICE_TOAST_ID = "compose-notice";

export type ComposeNoticeAction = { label: string; onClick: () => void | Promise<void> };

export type ComposeNoticePoll = {
	messageId: string;
	/** Called once the message is sent, failed or returned to Drafts. */
	onStatus: (status: "sent" | "failed" | "cancelled") => void;
};

export type ComposeNoticeOptions = {
	actions?: ComposeNoticeAction[];
	parts?: SendNoticeParts;
	/** `loading` shows a spinner and stays until the next notice replaces it. */
	tone?: "success" | "error" | "loading";
	durationMs?: number;
	countdown?: { endAt: number };
	/** Called once when the countdown reaches zero; the callback decides what replaces the toast. */
	onCountdownEnd?: () => void;
	/** Polls the message's delivery status while the toast is visible. */
	poll?: ComposeNoticePoll;
};

type ComposeContextValue = {
	open: boolean;
	draftId: string | null;
	openComposer: () => void;
	openDraftComposer: (draftId: string) => void;
	closeComposer: () => void;
	/** Shows the send toast (replacing any previous one) and returns its id; `actions` adds buttons, `durationMs` overrides the default. */
	showNotice: (message: string | null, options?: ComposeNoticeOptions) => number | null;
	/** Whether a notice id is still the latest one; async actions use it to avoid replacing a newer toast. */
	isCurrentNotice: (id: number) => boolean;
};

export type ComposeNotice = {
	id: number;
	message: string;
	parts?: SendNoticeParts;
	actions: ComposeNoticeAction[];
	tone: "success" | "error" | "loading";
	durationMs: number;
	countdown?: { endAt: number };
	onCountdownEnd?: () => void;
	poll?: ComposeNoticePoll;
};

const ComposeContext = createContext<ComposeContextValue | null>(null);

export function useCompose() {
	const ctx = useContext(ComposeContext);
	if (!ctx) throw new Error("useCompose must be used within ComposeProvider");
	return ctx;
}

export function ComposeProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [draftId, setDraftId] = useState<string | null>(null);
	const opener = useRef<HTMLElement | null>(null);

	function rememberOpener() {
		opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}
	const noticeId = useRef(0);

	return (
		<ComposeContext.Provider
			value={{
				open,
				draftId,
				openComposer: () => {
					rememberOpener();
					setDraftId(null);
					setOpen(true);
				},
				openDraftComposer: (nextDraftId) => {
					if (!open) rememberOpener();
					setDraftId(nextDraftId);
					setOpen(true);
				},
				closeComposer: () => {
					setOpen(false);
					setDraftId(null);
					const previous = opener.current;
					opener.current = null;
					if (previous) requestAnimationFrame(() => { if (previous.isConnected) previous.focus(); });
				},
				showNotice: (message, options) => {
					const id = ++noticeId.current;
					if (!message) {
						notify.dismiss(COMPOSE_NOTICE_TOAST_ID);
						return null;
					}
					const tone = options?.tone ?? "success";
					const notice: ComposeNotice = {
						id,
						message,
						parts: options?.parts,
						actions: options?.actions ?? [],
						tone,
						// Same timing rules as every toast: errors and anything with buttons stay longer.
						durationMs: options?.durationMs ?? (tone === "loading" ? 120_000 : tone === "error" || options?.actions?.length ? 8000 : 4000),
						countdown: options?.countdown,
						onCountdownEnd: options?.onCountdownEnd,
						poll: options?.poll,
					};
					// A countdown notice normally replaces itself when it reaches zero; the grace keeps that
					// transition ahead of dismissal.
					const duration = Math.max(0, notice.durationMs) + (notice.onCountdownEnd ? 2000 : 0);
					// `key` remounts the content per notice so countdown and polling state never leak between sends.
					notify.custom(() => <ComposeNoticeToast key={id} notice={notice} />, { id: COMPOSE_NOTICE_TOAST_ID, duration });
					return id;
				},
				isCurrentNotice: (id) => noticeId.current === id,
			}}
		>
			{children}
		</ComposeContext.Provider>
	);
}
