import type { FolderColor } from "./types";

/** Translation keys for the names of the shared folder/event colors. */
export const folderColorKeys = {
	"#2563eb": "Blue",
	"#7c3aed": "Purple",
	"#db2777": "Pink",
	"#dc2626": "Red",
	"#ea580c": "Orange",
	"#d97706": "Amber",
	"#16a34a": "Green",
	"#0d9488": "Teal",
} satisfies Record<FolderColor, string>;
