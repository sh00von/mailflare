"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "@/components/icons";
import type { ComposeNotice, ComposeNoticeAction } from "@/components/compose/compose-context";
import { authFetch } from "@/lib/auth/client";

const STATUS_POLL_MS = 1000;

function NoticeIcon({ notice }: { notice: ComposeNotice }) {
	const className = "h-[18px] w-[18px] shrink-0";
	if (notice.tone === "loading") return <Loader2 className={`${className} animate-spin text-neutral-500`} aria-hidden="true" />;
	if (notice.tone === "error") return <AlertCircle className={`${className} text-red-600`} aria-hidden="true" />;
	// Nothing has been sent yet while the undo window counts down.
	if (notice.countdown) return <Clock className={`${className} text-blue-600`} aria-hidden="true" />;
	return <CheckCircle2 className={`${className} text-green-600`} aria-hidden="true" />;
}

/**
 * The composer's send notice (undo window countdown, delivery status, Undo / Send now), rendered inside the
 * app's Sonner toaster with the same card look as every other toast. Shown via `showNotice` in compose-context.
 */
export function ComposeNoticeToast({ notice }: { notice: ComposeNotice }) {
	const [now, setNow] = useState(() => Date.now());
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const countdownEnded = useRef(false);
	const countdown = notice.countdown;
	const parts = notice.parts;
	useEffect(() => {
		if (!countdown) return;
		const timer = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(timer);
	}, [countdown]);
	useEffect(() => {
		if (!countdown || !notice.onCountdownEnd || countdownEnded.current) return;
		if (now < countdown.endAt) return;
		countdownEnded.current = true;
		notice.onCountdownEnd();
	}, [countdown, notice, now]);

	// Delivery is asynchronous after the countdown; watch the persisted status instead of guessing.
	useEffect(() => {
		const poll = notice.poll;
		if (!poll) return;
		let cancelled = false;
		let timer: number | undefined;
		const check = async () => {
			if (cancelled) return;
			try {
				const response = await authFetch(`/api/messages/${poll.messageId}/send-status`);
				if (cancelled) return;
				if (response.ok) {
					const data = await response.json() as { status?: string };
					if (data.status === "sent") { poll.onStatus("sent"); return; }
					if (data.status === "failed") { poll.onStatus("failed"); return; }
					if (data.status === "draft") { poll.onStatus("cancelled"); return; }
				}
			} catch {
				// A transient poll failure keeps the toast waiting until the next attempt.
			}
			if (!cancelled) timer = window.setTimeout(() => void check(), STATUS_POLL_MS);
		};
		void check();
		return () => {
			cancelled = true;
			if (timer) window.clearTimeout(timer);
		};
	}, [notice.poll]);

	const secondsLeft = countdown ? Math.max(0, Math.ceil((countdown.endAt - now) / 1000)) : null;
	const ticker = parts?.ticker && secondsLeft !== null ? parts.ticker(secondsLeft) : null;

	async function runAction(action: ComposeNoticeAction) {
		if (pendingAction) return;
		const result = action.onClick();
		if (!(result instanceof Promise)) return;
		setPendingAction(action.label);
		try {
			await result;
		} finally {
			setPendingAction(null);
		}
	}

	return (
		<div className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 font-sans text-sm text-neutral-900 shadow-lg sm:w-[356px]">
			<NoticeIcon notice={notice} />
			<span className="min-w-0 flex-1 break-words font-medium leading-5">
				{parts ? (
					<>
						{parts.before}
						{parts.link && (
							<Link href={parts.link.href} className="text-blue-600 underline-offset-2 hover:underline">
								{parts.link.label}
							</Link>
						)}
						{parts.after}
						{/* The countdown changes every second; keep it out of the live region. */}
						{ticker !== null && <span aria-live="off">{ticker}</span>}
					</>
				) : notice.message}
			</span>
			{notice.actions.map((action) => (
				<button
					key={action.label}
					type="button"
					onClick={() => void runAction(action)}
					disabled={pendingAction !== null}
					className="h-8 shrink-0 rounded-md px-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
				>
					{action.label}
				</button>
			))}
		</div>
	);
}
