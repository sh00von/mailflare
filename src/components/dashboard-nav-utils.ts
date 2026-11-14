import type { MessageCounts, MessageFolder } from "@/hooks/types";
import { runBulkMessageAction } from "@/components/messages/utils";
import { notify } from "@/lib/notify";

export function getFolderNavCount(folder: MessageFolder, counts: MessageCounts["folders"]): number | undefined {
	return counts[folder].unread;
}

/** Drag and drop onto a system folder; same toast and Undo as the toolbar, and a toast if it fails. */
export function moveMessagesToSystemFolder(messageIds: string[], action: "archive" | "spam" | "trash") {
	return runBulkMessageAction(messageIds, action).catch((error) => notify.error(error, "Could not move messages"));
}

export function moveMessagesToCustomFolder(messageIds: string[], folderId: string, folderName?: string) {
	return runBulkMessageAction(messageIds, "folder", true, folderId, { folderName }).catch((error) => notify.error(error, "Could not move messages"));
}
