"use client";

import { createElement, useEffect, useState } from "react";
import { Ban, FileCode2, Forward, Info, Mail, MailOpen, MoreVertical, Reply, ReplyAll, Star } from "@/components/icons";
import { useCompose } from "@/components/compose/compose-context";
import { notify } from "@/lib/notify";
import { MessageSourceDialog } from "@/components/messages/message-source-dialog";
import { MessageActionMenu, MessageActionMenuItem, MessageActionMenuSeparator } from "@/components/message-actions/action-menu";
import { getOwnAddressForMessage } from "@/app/(dashboard)/inbox/[messageId]/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	blockMessageContact,
	createForwardDraft,
	createReplyDraft,
	getMoveMessageActions,
	getReplyRecipients,
	getReplyThreading,
	hasAdditionalRecipients,
	runSingleMessageAction,
} from "@/components/message-actions/utils";
import { toggleMessageStar } from "./message-list-row-actions-utils";
import type { ThreadMessageActionsProps } from "./thread-message-actions-types";
import type { ReplyMode } from "@/components/message-actions/types";

export function ThreadMessageActions({
	message,
	mailboxId,
	ownAddress,
	ownAddresses = [],
	starOnly = false,
	detailsOpen = false,
	onToggleDetails,
}: ThreadMessageActionsProps) {
	const { openDraftComposer } = useCompose();
	const [starred, setStarred] = useState(message.starred);
	const [sourceOpen, setSourceOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const canReplyAll = hasAdditionalRecipients(message, ownAddresses);
	const moveActions = getMoveMessageActions(message.status, message.direction);
	const replyFromAddress = ownAddresses.length > 0
		? getOwnAddressForMessage(message, ownAddresses)
		: ownAddress;

	useEffect(() => setStarred(message.starred), [message.starred]);

	async function onToggleStar() {
		setPending(true);
		try {
			setStarred((await toggleMessageStar(message.id)).starred);
		} catch (nextError) {
			notify.error(nextError, "Unable to update star");
		} finally {
			setPending(false);
		}
	}

	async function onReply(mode: ReplyMode) {
		setPending(true);
		try {
			const draftId = await createReplyDraft({
				mailboxId,
				senderAddress: message.fromAddr,
				ownAddress: replyFromAddress,
				subject: message.subject,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
				sentAt: message.createdAt,
				recipients: getReplyRecipients(message, ownAddresses, mode),
				threading: getReplyThreading(message),
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			notify.error(nextError, "Could not start reply");
		} finally {
			setPending(false);
		}
	}

	async function onForward() {
		setPending(true);
		try {
			const draftId = await createForwardDraft({
				mailboxId,
				ownAddress: replyFromAddress,
				message,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			notify.error(nextError, "Could not start forward");
		} finally {
			setPending(false);
		}
	}

	async function onMessageAction(action: Parameters<typeof runSingleMessageAction>[1]) {
		setPending(true);
		try {
			await runSingleMessageAction(message.id, action);
		} catch (nextError) {
			notify.error(nextError, "Could not update message");
		} finally {
			setPending(false);
		}
	}

	async function onBlock() {
		if (!mailboxId) return;
		setPending(true);
		try {
			await blockMessageContact({ mailboxId, senderAddress: message.fromAddr });
			// Undo would bring the message back but not unblock the sender, so this toast has no Undo.
			await runSingleMessageAction(message.id, "trash", false);
			notify.success("Sender blocked and message moved to Trash");
		} catch (nextError) {
			notify.error(nextError, "Could not block contact");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex items-center gap-0.5">
			{onToggleDetails && (
				<Tooltip label={"Details"}>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={cn("h-8 w-8 px-0", detailsOpen && "bg-neutral-100 text-neutral-900")}
						aria-label={"Details"}
						aria-expanded={detailsOpen}
						onClick={onToggleDetails}
					>
						<Info className="h-4 w-4" />
					</Button>
				</Tooltip>
			)}
			<Tooltip label={starred ? "Remove star" : "Star"}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={starred ? "Remove star" : "Star"}
					aria-pressed={starred}
					disabled={pending}
					onClick={() => void onToggleStar()}
				>
					<Star className={starred ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} />
				</Button>
			</Tooltip>
			{!starOnly && (
				<>
					<Tooltip label={"Reply"}>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 w-8 px-0"
							aria-label={"Reply"}
							disabled={pending}
							onClick={() => void onReply("reply")}
						>
							<Reply className="h-4 w-4" />
						</Button>
					</Tooltip>
					<MessageActionMenu
						label={"More actions"}
						trigger={
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 px-0"
								aria-label={"More actions"}
								disabled={pending}
							>
								<MoreVertical className="h-4 w-4" />
							</Button>
						}
					>
						<MessageActionMenuItem icon={<Reply className="h-4 w-4" />} onSelect={() => void onReply("reply")}>
							Reply
						</MessageActionMenuItem>
						{canReplyAll && (
							<MessageActionMenuItem icon={<ReplyAll className="h-4 w-4" />} onSelect={() => void onReply("replyAll")}>
								Reply all
							</MessageActionMenuItem>
						)}
						<MessageActionMenuItem icon={<Forward className="h-4 w-4" />} onSelect={() => void onForward()}>
							Forward
						</MessageActionMenuItem>
						<MessageActionMenuItem icon={<FileCode2 className="h-4 w-4" />} onSelect={() => setSourceOpen(true)}>
							Show original
						</MessageActionMenuItem>
						<MessageActionMenuSeparator />
						<MessageActionMenuItem
							icon={message.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
							onSelect={() => void onMessageAction(message.read ? "unread" : "read")}
						>
							{message.read ? "Mark as unread" : "Mark as read"}
						</MessageActionMenuItem>
						{moveActions.map((item) => (
							<MessageActionMenuItem
								key={item.action}
								icon={createElement(item.icon, { size: 16 })}
								onSelect={() => void onMessageAction(item.action)}
							>
								{item.labelKey}
							</MessageActionMenuItem>
						))}
						{message.direction === "inbound" && mailboxId && (
							<>
								<MessageActionMenuSeparator />
								<MessageActionMenuItem icon={<Ban className="h-4 w-4" />} onSelect={() => void onBlock()}>
									Block contact
								</MessageActionMenuItem>
							</>
						)}
					</MessageActionMenu>
					<MessageSourceDialog messageId={message.id} open={sourceOpen} onOpenChange={setSourceOpen} />
				</>
			)}
		</div>
	);
}
