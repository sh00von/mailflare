import { Archive, Clock, CalendarClock, MailOpen, Send, ShieldAlert, Star, Trash2 } from "@/components/icons";
import type { MessageFolderConfig } from "./types";

export const inboxFolderConfig: MessageFolderConfig = {
	folder: "inbox",
	title: "Inbox",
	titleKey: "Inbox",
	emptyTextKey: "No emails",
	emptyText: "No emails",
	hrefPrefix: "/mail/inbox",
	icon: Star,
	showRowBadge: false,
};

export const starredFolderConfig: MessageFolderConfig = {
	folder: "starred",
	title: "Starred",
	titleKey: "Starred",
	emptyTextKey: "No starred emails",
	emptyText: "No starred emails",
	hrefPrefix: "/mail/starred",
	icon: Star,
	badgeVariant: "outline",
};

export const snoozedFolderConfig: MessageFolderConfig = {
	folder: "snoozed",
	title: "Snoozed",
	titleKey: "Snoozed",
	emptyTextKey: "No snoozed emails",
	emptyText: "No snoozed emails",
	hrefPrefix: "/mail/snoozed",
	icon: Clock,
	badgeVariant: "outline",
};

export const sentFolderConfig: MessageFolderConfig = {
	folder: "sent",
	title: "Sent",
	titleKey: "Sent",
	emptyTextKey: "No emails",
	emptyText: "No emails",
	hrefPrefix: "/mail/sent",
	icon: Send,
	badgeVariant: "outline",
};

export const scheduledFolderConfig: MessageFolderConfig = {
	folder: "scheduled",
	title: "Scheduled",
	titleKey: "Scheduled",
	emptyTextKey: "No scheduled emails",
	emptyText: "No scheduled emails",
	hrefPrefix: "/mail/scheduled",
	icon: CalendarClock,
	badgeVariant: "outline",
};

export const archivedFolderConfig: MessageFolderConfig = {
	folder: "archived",
	title: "Archived",
	titleKey: "Archived",
	emptyTextKey: "No archived emails",
	emptyText: "No archived emails",
	hrefPrefix: "/mail/archived",
	icon: Archive,
	badgeVariant: "outline",
};

export const spamFolderConfig: MessageFolderConfig = {
	folder: "spam",
	title: "Spam",
	titleKey: "Spam",
	emptyTextKey: "No spam",
	emptyText: "No spam",
	hrefPrefix: "/mail/spam",
	icon: ShieldAlert,
	badgeVariant: "outline",
};

export const trashFolderConfig: MessageFolderConfig = {
	folder: "trash",
	title: "Trash",
	titleKey: "Trash",
	emptyTextKey: "No emails in trash",
	emptyText: "No emails in trash",
	hrefPrefix: "/mail/trash",
	icon: Trash2,
	badgeVariant: "outline",
};
