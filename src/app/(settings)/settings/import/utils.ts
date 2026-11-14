import type { ImportJobSummary } from "@/lib/import/jobs-types";
import { authFetch } from "@/lib/auth/client";
import { getMailboxFolders, invalidateFolderCache } from "@/lib/folders/client";
import type {
	ImportFolderSummary,
	ImportSourceItem,
	ImportSourceOption,
	ImportSourceSection,
} from "./types";

export const importSourceOptions: ImportSourceOption[] = [
	{ value: "inbox", label: "Inbox", destination: "system:inbox", system: true },
	{ value: "sent", label: "Sent", destination: "system:sent", system: true },
	{ value: "drafts", label: "Drafts", destination: "system:drafts", system: true },
	{ value: "archived", label: "Archived", destination: "system:archived", system: true },
	{ value: "spam", label: "Spam", destination: "system:spam", system: true },
	{ value: "trash", label: "Trash", destination: "system:trash", system: true },
	{ value: "others", label: "Others", destination: "system:inbox" },
];

export function getImportSourceOption(section: ImportSourceSection): ImportSourceOption {
	return importSourceOptions.find((option) => option.value === section) ?? importSourceOptions[0];
}

export function getSelectedImportSources(sections: ImportSourceSection[]): ImportSourceItem[] {
	return sections.map((section) => {
		const option = getImportSourceOption(section);
		return {
			id: `system:${option.value}`,
			label: option.label,
			destination: option.destination,
			sourceSection: option.value,
		};
	});
}

export function getFolderImportSource(folderName: string): ImportSourceItem {
	return {
		id: `folder:${folderName}`,
		label: folderName,
		destination: "",
		folderName,
	};
}

export function getFileImportSource(selectedSources: ImportSourceItem[]): ImportSourceItem {
	return selectedSources[0] ?? {
		id: "system:inbox",
		label: "Inbox",
		destination: "system:inbox",
		sourceSection: "inbox",
	};
}

export async function ensureImportDestination(
	mailboxId: string,
	source: ImportSourceItem,
): Promise<string> {
	if (source.destination) return source.destination;
	const folderName = source.folderName || source.label;
	const folderRes = await getMailboxFolders(mailboxId);
	const existing = (folderRes.folders as ImportFolderSummary[] | undefined)?.find(
		(folder: ImportFolderSummary) => folder.name.toLowerCase() === folderName.toLowerCase(),
	);
	if (existing) return `folder:${existing.id}`;

	const response = await authFetch("/api/folders", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mailboxId, name: folderName }),
	});
	if (!response.ok) throw new Error(`Unable to create folder for ${folderName}`);
	invalidateFolderCache();
	const data = (await response.json()) as { folder?: { id: string } };
	if (!data.folder?.id) throw new Error(`Folder was not created for ${folderName}`);
	return `folder:${data.folder.id}`;
}

export async function fetchImportJobs(): Promise<ImportJobSummary[]> {
	const response = await authFetch("/api/import/jobs");
	if (!response.ok) throw new Error("Unable to load imports");
	return (await readImportJson<{ jobs?: ImportJobSummary[] }>(response)).jobs ?? [];
}

export async function removeImportJob(id: string): Promise<void> {
	const response = await authFetch(`/api/import/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
	if (!response.ok) throw new Error("Unable to update the import");
}

export async function resumeImportJob(id: string, password?: string): Promise<void> {
	const response = await authFetch(`/api/import/jobs/${encodeURIComponent(id)}/resume`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(password ? { password } : {}),
	});
	if (!response.ok) {
		const data = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(data?.error || "Unable to resume the import");
	}
}

async function readImportJson<T extends object>(response: Response): Promise<T> {
	const text = await response.text();
	try {
		return JSON.parse(text) as T;
	} catch {
		const status = response.status === 503 ? "the Worker exceeded its resource limits" : `HTTP ${response.status}`;
		throw new Error(`Import request failed (${status}). Try again with a smaller batch size.`);
	}
}
