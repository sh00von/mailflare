export type BulkMessageAction = "archive" | "trash" | "spam" | "read" | "unread" | "inbox" | "folder" | "delete" | "restore";

/** Actions that move messages somewhere else; their responses carry `previous` so the move can be undone. */
export type BulkMoveAction = "archive" | "trash" | "spam" | "inbox" | "folder";

/** Where a message was before a move, as returned by the move and sent back by `restore`. */
export type BulkMessagePlacement = {
	id: string;
	status: string;
	folderId: string | null;
	/** Epoch milliseconds, or null when the message was not snoozed. */
	snoozedUntil: number | null;
	/** The Spam / Not spam feedback the message had, which `restore` puts back exactly. */
	spamClassification: "spam" | "ham" | null;
};

/** Folders whose messages can be permanently deleted or emptied in one go. */
export type PermanentDeleteFolder = "trash" | "spam";

export type BulkMessagePayload = {
	messageIds?: string[];
	action?: BulkMessageAction;
	folderId?: string;
	/** `restore` only: the placements a move returned. */
	items?: BulkMessagePlacement[];
};

export type BulkMoveResponse = { ok: true; previous: BulkMessagePlacement[] };
