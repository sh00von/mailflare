export type ImportSourceSection = "inbox" | "sent" | "drafts" | "archived" | "spam" | "trash" | "others";

export type ImportSourceOption = {
	value: ImportSourceSection;
	label: string;
	destination: string;
	system?: boolean;
};

export type ImportTab = "file" | "takeout";

export type ImportSourceItem = {
	id: string;
	label: string;
	destination: string;
	folderName?: string;
	sourceSection?: ImportSourceSection;
};

export type ImportFolderSummary = {
	id: string;
	name: string;
};

export type ImportProgress = {
	completed: number;
	label: string;
	total: number;
};
