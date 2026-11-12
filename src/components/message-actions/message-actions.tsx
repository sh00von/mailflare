"use client";

import { createElement, Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Ban, BellOff, Clock, FileCode2, Forward, Mail, MailOpen, MoreVertical, Reply, ReplyAll, ShieldAlert, ShieldCheck, Trash2 } from "@/components/icons";
import { useCompose } from "@/components/compose/compose-context";
import { MessageSourceDialog } from "@/components/messages/message-source-dialog";
import { useMessageListVisibility } from "@/components/messages/message-list-visibility";
import { MessageSnoozeDialog } from "./message-snooze-dialog";
import { requestUnsubscribe } from "@/components/messages/unsubscribe-button-utils";
import { MessageActionMenu, MessageActionMenuItem, MessageActionMenuLabel, MessageActionMenuSeparator } from "./action-menu";
import { getVisibleActionCount } from "./action-overflow-utils";
import { useHotkeys, useShortcuts } from "@/components/shortcuts";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { MessageActionsProps, ReplyMode } from "./types";
import { getPermanentDeleteConfirmText, PartialDeleteError, supportsPermanentDelete } from "@/lib/messages/permanent-delete-utils";
import {
	confirmTrashWithoutUnsubscribe,
	blockMessageContact,
	createForwardDraft,
	createReplyDraft,
	createTrashSenderRule,
	getMessageActionRedirect,
	getMessageBackHref,
	getMoveMessageActions,
	getReplyRecipients,
	getReplyThreading,
	hasAdditionalRecipients,
	openUnsubscribeUrl,
	runSingleMessageAction,
} from "./utils";

export function MessageActions({
	messageId,
	mailboxId,
	senderAddress,
	direction,
	status,
	read,
	unsubscribeUrl,
	subject,
	bodyText,
	ownAddress,
	ownAddresses = [],
	message,
	messageMeta,
	bodyHtml,
}: MessageActionsProps) {
	const router = useRouter();
	const { openDraftComposer, showNotice } = useCompose();
	const { backHref: listHref } = useMessageListVisibility();
	const { shortcutsEnabled } = useShortcuts();
	const [pendingAction, setPendingAction] = useState<
		BulkMessageAction | "unsubscribe" | ReplyMode | "forward" | "block" | null
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [visibleCount, setVisibleCount] = useState(0);
	const actionsRef = useRef<HTMLDivElement>(null);
	const [sourceOpen, setSourceOpen] = useState(false);
	const [snoozeOpen, setSnoozeOpen] = useState(false);

	const runAction = useCallback(async (action: BulkMessageAction) => {
		setPendingAction(action);
		setError(null);
		try {
			await runSingleMessageAction(messageId, action);
			const redirect = getMessageActionRedirect(action, listHref);
			if (redirect) router.push(redirect);
			router.refresh();
		} catch {
			setError("Could not update message");
		} finally {
			setPendingAction(null);
		}
	}, [messageId, listHref, router]);

	// In Trash and Spam the delete button removes the message for good instead of
	// being a no-op, after the user confirms.
	const canDeleteForever = supportsPermanentDelete(status);
	const deleteForever = useCallback(async () => {
		if (!window.confirm(getPermanentDeleteConfirmText(1))) return;
		setPendingAction("delete");
		setError(null);
		try {
			await runSingleMessageAction(messageId, "delete");
			router.push(getMessageBackHref(direction, status));
			router.refresh();
		} catch (deleteError) {
			setError(deleteError instanceof PartialDeleteError ? "Some messages could not be deleted because they are no longer in Trash or Spam." : "Could not delete message");
			setPendingAction(null);
		}
	}, [messageId, direction, status, router]);
	const onTrashClick = () => (canDeleteForever ? void deleteForever() : void runAction("trash"));
	const trashLabel = canDeleteForever ? "Delete forever" : "Move to trash";

	const replyable = useMemo(() => message ?? {
		direction,
		fromAddr: senderAddress,
		toAddr: "",
		ccAddr: null,
		replyTo: null,
		providerMessageId: null,
		references: null,
		threadId: null,
	}, [message, direction, senderAddress]);
	const canReplyAll = hasAdditionalRecipients(replyable, ownAddresses);

	const handleReply = useCallback(async (mode: ReplyMode) => {
		setPendingAction(mode);
		setError(null);
		try {
			const draftId = await createReplyDraft({
				mailboxId,
				senderAddress,
				ownAddress,
				subject,
				bodyText,
				bodyHtml,
				sentAt: messageMeta?.createdAt,
				recipients: getReplyRecipients(replyable, ownAddresses, mode),
				threading: getReplyThreading(replyable),
			});
			openDraftComposer(draftId);
		} catch (replyError) {
			setError(replyError instanceof Error ? replyError.message : "Could not start reply");
		} finally {
			setPendingAction(null);
		}
	}, [mailboxId, senderAddress, ownAddress, subject, bodyText, bodyHtml, messageMeta?.createdAt, replyable, ownAddresses, openDraftComposer]);

	const shortcuts = useMemo(
		() => [
			{
				key: "e",
				label: "Archive Message",
				category: "Actions" as const,
				action: () => {
					if (status !== "archived") void runAction("archive");
				},
			},
			{
				key: "y",
				label: "Archive Message",
				category: "Actions" as const,
				action: () => {
					if (status !== "archived") void runAction("archive");
				},
			},
			{
				key: "#",
				label: "Move to Trash",
				category: "Actions" as const,
				action: () => {
					if (status !== "trash") void runAction("trash");
				},
			},
			{
				key: "r",
				label: "Reply to Message",
				category: "Composing" as const,
				action: () => void handleReply("reply"),
			},
			{
				key: "!",
				label: "Report Spam",
				category: "Actions" as const,
				action: () => {
					if (status !== "spam" && direction === "inbound") void runAction("spam");
				},
			},
			{
				key: "u",
				label: "Back to List",
				category: "Navigation" as const,
				action: () => router.back(),
			},
		],
		[status, direction, runAction, handleReply, router]
	);

	useHotkeys(shortcuts, { enabled: shortcutsEnabled });

	async function onUnsubscribe() {
		setError(null);
		if (unsubscribeUrl) {
			setPendingAction("unsubscribe");
			try {
				const result = await requestUnsubscribe(messageId);
				if (result.method === "link") {
					openUnsubscribeUrl(result.url);
					showNotice("Unsubscribe page opened in a new tab");
				} else if (result.method === "mailto") {
					showNotice("Unsubscribe email sent");
				} else {
					showNotice("Unsubscribed");
				}
			} catch {
				openUnsubscribeUrl(unsubscribeUrl);
			} finally {
				setPendingAction(null);
			}
			return;
		}

		if (!confirmTrashWithoutUnsubscribe()) return;
		setPendingAction("unsubscribe");
		if (!mailboxId) {
			setError("Could not create trash rule");
			setPendingAction(null);
			return;
		}

		try {
			await createTrashSenderRule({ mailboxId, senderAddress });
			await runAction("trash");
		} catch {
			setError("Could not create trash rule");
			setPendingAction(null);
		}
	}

	async function handleForward() {
		if (!message || !messageMeta) return;
		setPendingAction("forward");
		setError(null);
		try {
			const draftId = await createForwardDraft({
				mailboxId,
				ownAddress,
				message: { ...message, ...messageMeta },
				bodyText,
				bodyHtml,
			});
			openDraftComposer(draftId);
		} catch (forwardError) {
			setError(forwardError instanceof Error ? forwardError.message : "Could not start forward");
		} finally {
			setPendingAction(null);
		}
	}
	async function onBlockContact() {
		setError(null);
		if (!mailboxId) {
			setError("Could not block contact");
			return;
		}

		setPendingAction("block");
		try {
			await blockMessageContact({ mailboxId, senderAddress });
			await runSingleMessageAction(messageId, "trash");
			router.push(listHref);
			router.refresh();
		} catch (blockError) {
			setError(blockError instanceof Error ? blockError.message : "Could not block contact");
		} finally {
			setPendingAction(null);
		}
	}

	async function onUnsubscribeDeleteAll() {
		setError(null);
		setPendingAction("unsubscribe");
		try {
			const preview = await requestUnsubscribe(messageId, { action: "unsubscribe_and_trash", previewOnly: true });
			const count = "preview" in preview ? preview.preview.count : 0;
			if (!window.confirm(`Move ${count} past emails from this sender to Trash?`)) return;
			const result = await requestUnsubscribe(messageId, { action: "unsubscribe_and_trash" });
			if (result.method === "link") openUnsubscribeUrl(result.url);
			showNotice(`Unsubscribed and moved ${result.trashedCount ?? 0} emails to Trash`);
			router.refresh();
		} catch {
			setError("Could not unsubscribe");
		} finally {
			setPendingAction(null);
		}
	}

	const disabled = pendingAction !== null;
	const markAction: BulkMessageAction = read ? "unread" : "read";
	const moveActions = getMoveMessageActions(status, direction);

	// The row keeps a priority order and lets the width decide where the menu
	// starts: whatever does not fit is rendered in the overflow menu instead.
	const inlineActions: InlineMessageAction[] = [];
	const archiveAction = status === "archived"
		? direction === "inbound"
			? { action: "inbox" as const, label: "Unarchive", Icon: ArchiveRestore }
			: null
		: { action: "archive" as const, label: "Archive", Icon: Archive };
	if (archiveAction) {
		inlineActions.push({
			id: archiveAction.action === "inbox" ? "unarchive" : "archive",
			label: archiveAction.label,
			hint: archiveAction.action === "archive" ? "Archive (e)" : undefined,
			icon: <archiveAction.Icon size={iconSize} />,
			onSelect: () => void runAction(archiveAction.action),
			group: "primary",
		});
	}
	inlineActions.push({
		id: canDeleteForever ? "deleteForever" : "trash",
		label: trashLabel,
		hint: canDeleteForever ? undefined : "Move to trash (#)",
		icon: <Trash2 size={iconSize} />,
		onSelect: onTrashClick,
		group: "primary",
		destructive: canDeleteForever,
	});
	inlineActions.push({
		id: markAction,
		label: read ? "Mark as unread" : "Mark as read",
		icon: read ? <Mail size={iconSize} /> : <MailOpen size={iconSize} />,
		onSelect: () => void runAction(markAction),
		group: "primary",
	});
	inlineActions.push({
		id: "reply",
		label: "Reply",
		hint: "Reply (r)",
		icon: <Reply size={iconSize} />,
		onSelect: () => void handleReply("reply"),
		group: "secondary",
	});
	if (direction === "inbound") {
		inlineActions.push(status === "spam"
			? {
				id: "notSpam",
				label: "Not spam",
				icon: <ShieldCheck size={iconSize} />,
				onSelect: () => void runAction("inbox"),
				group: "secondary",
			}
			: {
				id: "spam",
				label: "Report spam",
				hint: "Report spam (!)",
				icon: <ShieldAlert size={iconSize} />,
				onSelect: () => void runAction("spam"),
				group: "secondary",
			});
	}
	if (canReplyAll) {
		inlineActions.push({
			id: "replyAll",
			label: "Reply all",
			icon: <ReplyAll size={iconSize} />,
			onSelect: () => void handleReply("replyAll"),
			group: "secondary",
		});
	}
	if (message && messageMeta) {
		inlineActions.push({
			id: "forward",
			label: "Forward",
			icon: <Forward size={iconSize} />,
			onSelect: () => void handleForward(),
			group: "secondary",
		});
	}

	const actionGroups = inlineActions.map((action) => action.group).join(",");
	const actionKey = inlineActions.map((action) => action.id).join(",");
	const dividerIndex = inlineActions.findIndex((action, index) => index > 0 && action.group !== inlineActions[index - 1].group);
	const overflowActions = inlineActions.slice(visibleCount);

	useLayoutEffect(() => {
		const element = actionsRef.current;
		if (!element) return;
		const row = element;
		const groups = actionGroups ? actionGroups.split(",") : [];
		function update() {
			const next = getVisibleActionCount({ availableWidth: row.clientWidth, groups });
			setVisibleCount((current) => (current === next ? current : next));
		}
		update();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(update);
		observer.observe(element);
		return () => observer.disconnect();
	}, [actionKey, actionGroups]);

	return (
		<div className="flex min-w-0 flex-1 items-center gap-2 text-neutral-600">
			{error && <span role="alert" className="text-xs text-red-600">{error}</span>}

			<div ref={actionsRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
				{inlineActions.slice(0, visibleCount).map((action, index) => {
					const tooltip = action.hint && shortcutsEnabled ? action.hint : action.label;
					return (
						<Fragment key={action.id}>
							{index === dividerIndex && (
								<span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
							)}
							<Tooltip label={tooltip}>
								<Button
									type="button"
									variant="ghost"
									size="roundedSM"
									className={cn("h-8 w-8 shrink-0 p-0", action.destructive && "text-red-600 hover:text-red-700")}
									aria-label={action.label}
									disabled={disabled}
									onClick={action.onSelect}
								>
									{action.icon}
								</Button>
							</Tooltip>
						</Fragment>
					);
				})}

				<MessageActionMenu
					label={"More actions"}
					trigger={
						<Button
							type="button"
							variant="ghost"
							size="roundedSM"
							className="h-8 w-8 shrink-0 p-0"
							aria-label={"More actions"}
							disabled={disabled}
						>
							<MoreVertical size={iconSize} />
						</Button>
					}
				>
					{overflowActions.map((action) => (
						<MessageActionMenuItem
							key={action.id}
							icon={action.icon}
							destructive={action.destructive}
							onSelect={action.onSelect}
						>
							{action.label}
						</MessageActionMenuItem>
					))}
					{overflowActions.length > 0 && <MessageActionMenuSeparator />}
					{direction === "inbound" && status === "received" && (
						<MessageActionMenuItem icon={<Clock size={iconSize} />} onSelect={() => setSnoozeOpen(true)}>
							Snooze
						</MessageActionMenuItem>
					)}
					{direction === "inbound" && (
						<>
							<MessageActionMenuItem
								icon={<BellOff size={iconSize} />}
								disabled={!unsubscribeUrl && status === "trash"}
								onSelect={() => void onUnsubscribe()}
							>
								Unsubscribe
							</MessageActionMenuItem>
							{unsubscribeUrl && (
								<MessageActionMenuItem
									icon={<Ban size={iconSize} />}
									disabled={status === "trash" || status === "spam"}
									onSelect={() => void onUnsubscribeDeleteAll()}
								>
									{"Unsubscribe & delete all"}
								</MessageActionMenuItem>
							)}
							<MessageActionMenuItem icon={<Ban size={iconSize} />} onSelect={() => void onBlockContact()}>
								Block contact
							</MessageActionMenuItem>
							<MessageActionMenuSeparator />
						</>
					)}
					<MessageActionMenuItem icon={<FileCode2 size={iconSize} />} onSelect={() => setSourceOpen(true)}>
						Show original
					</MessageActionMenuItem>
					<MessageActionMenuSeparator />
					<MessageActionMenuLabel>Move to</MessageActionMenuLabel>
					{moveActions.map((item) => (
						<MessageActionMenuItem
							key={item.action}
							icon={createElement(item.icon, { size: iconSize })}
							onSelect={() => void runAction(item.action)}
						>
							{item.labelKey}
						</MessageActionMenuItem>
					))}
				</MessageActionMenu>
			</div>

			<MessageSourceDialog messageId={messageId} open={sourceOpen} onOpenChange={setSourceOpen} />
			<MessageSnoozeDialog messageId={messageId} open={snoozeOpen} onOpenChange={setSnoozeOpen} />
		</div>
	);
}

type InlineMessageAction = {
	id: string;
	label: string;
	/** Tooltip variant that names the keyboard shortcut, when shortcuts are on. */
	hint?: string;
	icon: ReactNode;
	onSelect: () => void;
	group: "primary" | "secondary";
	destructive?: boolean;
};

const iconSize = 16;
