"use client";

import { FileText } from "@/components/icons";
import { MessageFolderPage } from "@/components/messages/message-folder-page";

export default function DraftsPage() {
	return (
		<MessageFolderPage
			config={{
				folder: "drafts",
				title: "Drafts",
				titleKey: "Drafts",
				emptyText: "No drafts",
				emptyTextKey: "No drafts",
				hrefPrefix: "/mail/drafts",
				icon: FileText,
				badgeVariant: "outline",
			}}
		/>
	);
}
