export type ImportJobKind = "file" | "imap";

export type ImportJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

/** What the browser sees; timestamps are ISO strings. */
export type ImportJobSummary = {
	id: string;
	mailboxId: string;
	kind: ImportJobKind;
	label: string;
	status: ImportJobStatus;
	total: number;
	processed: number;
	imported: number;
	skipped: number;
	errors: string[];
	errorCount: number;
	error: string | null;
	currentSource: string | null;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
};

export type FileImportSpec = {
	destination: string;
	/** Staged batch objects, see staging.ts. */
	batches: number;
};

export type FileImportCursor = { batch: number };

export type ImportJobMessage = {
	kind: "import.run";
	jobId: string;
	attempt?: number;
};
