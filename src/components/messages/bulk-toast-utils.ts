import type { BulkMessageAction, BulkMessagePlacement } from "@/app/api/messages/bulk/types";

export type BulkToastContext = {
	/** How many things the user selected (conversations in conversation view), not expanded message ids. */
	count: number;
	/** Singular noun for the selection; defaults to "message". */
	noun?: string;
	/** Display name of the target folder for `folder` moves. */
	folderName?: string;
	/** Placements the move returned; used to tell "Not spam" apart from a plain move to Inbox. */
	previous?: BulkMessagePlacement[];
};

/**
 * The success line for a bulk action, or null when the result is already visible on screen (read/unread) and
 * no toast should appear. One selected item gets a short line ("Archived"); several say how many.
 */
export function bulkActionToastLabel(action: BulkMessageAction, context: BulkToastContext): string | null {
	const count = Math.max(1, Math.floor(context.count));
	const noun = context.noun ?? "message";
	const many = count > 1 ? `${count} ${noun}s ` : "";
	const leadIn = (single: string, plural: string) => (count > 1 ? `${many}${plural}` : single);
	switch (action) {
		case "archive":
			return leadIn("Archived", "archived");
		case "trash":
			return leadIn("Moved to Trash", "moved to Trash");
		case "spam":
			return leadIn("Marked as spam", "marked as spam");
		case "inbox": {
			const fromSpam = !!context.previous?.length && context.previous.every((item) => item.status === "spam");
			return fromSpam ? leadIn("Marked as not spam", "marked as not spam") : leadIn("Moved to Inbox", "moved to Inbox");
		}
		case "folder": {
			const target = context.folderName?.trim() || "folder";
			return leadIn(`Moved to ${target}`, `moved to ${target}`);
		}
		case "delete":
			return leadIn("Deleted forever", "deleted forever");
		default:
			return null;
	}
}
