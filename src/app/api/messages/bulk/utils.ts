import type { BulkMessageAction, BulkMoveAction, PermanentDeleteFolder } from "./types";

const allowedBulkActions = new Set<BulkMessageAction>([
	"archive",
	"trash",
	"spam",
	"read",
	"unread",
	"inbox",
	"folder",
	"delete",
	"restore",
]);

const moveActions = new Set<BulkMessageAction>(["archive", "trash", "spam", "inbox", "folder"]);

export function isBulkMoveAction(action: BulkMessageAction): action is BulkMoveAction {
	return moveActions.has(action);
}

/** The most placements one Undo may restore (a large bulk move is still one Undo). */
export const MAX_RESTORE_ITEMS = 1000;

/**
 * Whether `restore` may put a message into `status`. Only places a move could have taken it from: inbound mail
 * lives in the inbox, archive, spam or trash; outbound in sent, archive or trash, or `received` inside a custom
 * folder (moving sent mail to a folder sets that status). Drafts and scheduled sends are never targets.
 */
export function isValidRestoreTarget(direction: string, status: unknown, hasFolder: boolean): boolean {
	if (typeof status !== "string") return false;
	if (direction === "inbound") return status === "received" || status === "archived" || status === "spam" || status === "trash";
	if (direction === "outbound") return status === "sent" || status === "archived" || status === "trash" || (status === "received" && hasFolder);
	return false;
}

export function isAllowedBulkMessageAction(action: unknown): action is BulkMessageAction {
	return typeof action === "string" && allowedBulkActions.has(action as BulkMessageAction);
}

export function getStatusForBulkAction(action: BulkMessageAction): string | null {
	if (action === "archive") return "archived";
	if (action === "trash") return "trash";
	if (action === "spam") return "spam";
	if (action === "inbox") return "received";
	if (action === "folder") return "received";
	return null;
}

export function getReadValueForBulkAction(action: BulkMessageAction): boolean | null {
	if (action === "read") return true;
	if (action === "unread") return false;
	return null;
}

/**
 * Permanent deletion is only offered for mail the user already threw away, so a
 * stray "delete" can never destroy something still in the inbox, a folder or Sent.
 */
export function isPermanentlyDeletableStatus(status: string | null | undefined): status is PermanentDeleteFolder {
	return status === "trash" || status === "spam";
}

export function isPermanentDeleteFolder(folder: unknown): folder is PermanentDeleteFolder {
	return folder === "trash" || folder === "spam";
}
