"use client";

import { useState } from "react";
import { MailCheck } from "@/components/icons";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { openUnsubscribeUrl } from "@/components/message-actions/utils";
import { requestUnsubscribe } from "./unsubscribe-button-utils";

/**
 * The header-level unsubscribe action. The route decides the real mechanism —
 * one-click POST, sent mailto, or a link to open — this only reflects the
 * outcome and keeps an "Unsubscribed" state instead of offering it twice.
 */
export function MessageUnsubscribeButton({ messageId, variant = "header" }: { messageId: string; variant?: "header" | "row" }) {
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// The confirm dialog closes at once; progress and the outcome are toasts.
	async function onUnsubscribe() {
		setConfirmOpen(false);
		setPending(true);
		// The outcome replaces the loading toast in place.
		const toastId = notify.loading("Unsubscribing…");
		try {
			const result = await requestUnsubscribe(messageId);
			setDone(true);
			if (result.method === "link") {
				openUnsubscribeUrl(result.url);
				notify.success("Unsubscribe page opened in a new tab", { id: toastId });
			} else if (result.method === "mailto") {
				notify.success("Unsubscribe email sent", { id: toastId });
			} else {
				notify.success("Unsubscribed", { id: toastId });
			}
		} catch (error) {
			notify.error(error, "Could not unsubscribe", { id: toastId });
		} finally {
			setPending(false);
		}
	}

	const row = variant === "row";
	if (done) {
		return (
			<span role="status" className="flex items-center gap-1 px-1 text-xs font-medium text-green-700">
				<MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
				Unsubscribed
			</span>
		);
	}
	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className={row ? "h-5 border border-neutral-300 px-2 text-xs" : "h-5 px-2 text-xs text-[var(--primary)] hover:text-[var(--primary)]"}
				disabled={pending}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setConfirmOpen(true);
				}}
			>
				Unsubscribe
			</Button>
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				{/* React events bubble through the portal; keep clicks from reaching the list row. */}
				<DialogContent onClick={(event) => event.stopPropagation()}>
					<DialogHeader>
						<DialogTitle>Unsubscribe from this sender?</DialogTitle>
						<DialogDescription>{"We'll ask the sender to remove you from their mailing list. If they don't support one-click unsubscribe, we'll send an unsubscribe email or open their page."}</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button type="button" size="sm" onClick={() => void onUnsubscribe()}>
							Unsubscribe
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
