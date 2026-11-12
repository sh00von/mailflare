import type { PermanentDeleteFolder } from "@/app/api/messages/bulk/types";

const folderLabels = { trash: "Trash", spam: "Spam" } as const;

export function getPermanentDeleteFolderLabel(folder: PermanentDeleteFolder): string {
	return folderLabels[folder];
}

/** Whether the folder being viewed offers "Delete forever" and "Empty …". */
export function supportsPermanentDelete(folder: string | null | undefined): folder is PermanentDeleteFolder {
	return folder === "trash" || folder === "spam";
}

export function getEmptyFolderLabel(folder: PermanentDeleteFolder): string {
	return `Empty ${getPermanentDeleteFolderLabel(folder)}`;
}

export function getPermanentDeleteConfirmText(count: number): string {
	return (count === 1 ? "Permanently delete this message? This cannot be undone." : `Permanently delete these ${count} messages? This cannot be undone.`);
}

export function getEmptyFolderConfirmText(folder: PermanentDeleteFolder, total?: number): string {
	const folderLabel = getPermanentDeleteFolderLabel(folder);
	if (total === 1) return `Permanently delete the 1 message in ${folderLabel}? This cannot be undone.`;
	return total && total > 1
		? `Permanently delete all ${total} messages in ${folderLabel}? This cannot be undone.`
		: `Permanently delete every message in ${folderLabel}? This cannot be undone.`;
}

/** Some of the requested messages were not in Trash or Spam any more, so the server kept them. */
export class PartialDeleteError extends Error {
	constructor(readonly skipped: number) {
		super("Some messages could not be deleted");
	}
}

export async function throwIfDeleteSkipped(response: Response, action: string): Promise<void> {
	if (action !== "delete") return;
	const result = (await response.json().catch(() => null)) as { skipped?: number } | null;
	if (!result?.skipped) return;
	window.dispatchEvent(new Event("replyot:messages-changed"));
	throw new PartialDeleteError(result.skipped);
}
