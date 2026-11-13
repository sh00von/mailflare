import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { importJobs, mailboxes } from "@/db/schema";
import { newId } from "@/lib/ids";
import { getImportMessageUserId, parseImportDestination } from "./destination";
import { deleteStagedImport, importBatchKey, stageImportMessages, unpackImportMessages } from "./staging";
import { importMessagesToMailbox } from "./service";
import type {
	FileImportCursor,
	FileImportSpec,
	ImportJobMessage,
	ImportJobSummary,
} from "./jobs-types";
import type { ImportMailboxResult, ImportMessageInput } from "./types";

const ACTIVE = ["queued", "running"] as const;
const MAX_STORED_ERRORS = 20;
const STALE_AFTER_MS = 30 * 60 * 1000;
const KEEP_FINISHED_MS = 7 * 24 * 60 * 60 * 1000;

type JobRow = typeof importJobs.$inferSelect;

type Chunk = {
	result: ImportMailboxResult;
	cursor: FileImportCursor;
	totalDelta: number;
	done: boolean;
	consumedKey?: string;
};

function parseJson<T>(value: string, fallback: T): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

async function enqueue(env: CloudflareEnv, message: ImportJobMessage): Promise<void> {
	await env.OUTBOUND_QUEUE.send(message);
}

function toImportJobSummary(row: JobRow): ImportJobSummary {
	return {
		id: row.id,
		mailboxId: row.mailboxId,
		kind: row.kind as "file",
		label: row.label,
		status: row.status as any,
		total: row.total,
		processed: row.processed,
		imported: row.imported,
		skipped: row.skipped,
		errors: parseJson<string[]>(row.errors, []),
		errorCount: row.errorCount,
		error: row.error,
		currentSource: null,
		createdAt: row.createdAt.toISOString(),
		startedAt: row.startedAt?.toISOString() ?? null,
		finishedAt: row.finishedAt?.toISOString() ?? null,
	};
}

export async function listImportJobs(
	env: CloudflareEnv,
	userId: string,
	mailboxId: string,
): Promise<ImportJobSummary[]> {
	const db = getDb(env);
	const rows = await db
		.select()
		.from(importJobs)
		.where(and(eq(importJobs.userId, userId), eq(importJobs.mailboxId, mailboxId)))
		.orderBy(desc(importJobs.createdAt))
		.limit(20);
	return rows.map(toImportJobSummary);
}

export async function getImportJob(
	env: CloudflareEnv,
	userId: string,
	jobId: string,
): Promise<ImportJobSummary | null> {
	const db = getDb(env);
	const [row] = await db
		.select()
		.from(importJobs)
		.where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
		.limit(1);
	return row ? toImportJobSummary(row) : null;
}

export async function createFileImportJob(
	env: CloudflareEnv,
	input: {
		userId: string;
		mailboxId: string;
		label: string;
		destination: string;
		messages: ImportMessageInput[];
	},
): Promise<ImportJobSummary> {
	const db = getDb(env);
	const id = newId("imp");
	const batches = await stageImportMessages(env, id, input.messages);
	const spec: FileImportSpec = { destination: input.destination, batches };
	const cursor: FileImportCursor = { batch: 0 };
	try {
		const [row] = await db
			.insert(importJobs)
			.values({
				id,
				userId: input.userId,
				mailboxId: input.mailboxId,
				kind: "file",
				label: input.label,
				total: input.messages.length,
				spec: JSON.stringify(spec),
				cursor: JSON.stringify(cursor),
			})
			.returning();
		await enqueue(env, { kind: "import.run", jobId: id });
		return toImportJobSummary(row);
	} catch (error) {
		await deleteStagedImport(env, id, batches);
		await db.delete(importJobs).where(eq(importJobs.id, id));
		throw error;
	}
}

async function cleanupJob(env: CloudflareEnv, row: JobRow): Promise<void> {
	if (row.kind !== "file") return;
	const spec = parseJson<FileImportSpec>(row.spec, { destination: "", batches: 0 });
	await deleteStagedImport(env, row.id, spec.batches);
}

export async function cancelOrDismissImportJob(env: CloudflareEnv, userId: string, jobId: string): Promise<boolean> {
	const db = getDb(env);
	const [row] = await db
		.select()
		.from(importJobs)
		.where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
		.limit(1);
	if (!row) return false;
	if (row.status === "queued" || row.status === "running") {
		const now = new Date();
		await db
			.update(importJobs)
			.set({ status: "cancelled", finishedAt: now, updatedAt: now })
			.where(and(eq(importJobs.id, jobId), inArray(importJobs.status, [...ACTIVE])));
		await cleanupJob(env, row);
	} else {
		await db.delete(importJobs).where(eq(importJobs.id, jobId));
		await cleanupJob(env, row);
	}
	return true;
}

export type ResumeImportResult =
	| { ok: true; job: ImportJobSummary }
	| { ok: false; status: 400 | 404 | 409; error: string };

export async function resumeImportJob(
	env: CloudflareEnv,
	userId: string,
	jobId: string,
): Promise<ResumeImportResult> {
	const db = getDb(env);
	const [row] = await db
		.select()
		.from(importJobs)
		.where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
		.limit(1);
	if (!row) return { ok: false, status: 404, error: "Import not found" };
	if (row.status !== "failed") return { ok: false, status: 409, error: "Only a failed import can be resumed" };

	const parsed = parseJson<FileImportCursor>(row.cursor, { batch: 0 });
	if (!(await env.BUCKET.head(importBatchKey(row.id, parsed.batch)))) {
		return { ok: false, status: 409, error: "Uploaded files are no longer available; upload them again" };
	}

	const now = new Date();
	const [claimed] = await db
		.update(importJobs)
		.set({ status: "queued", error: null, finishedAt: null, updatedAt: now })
		.where(and(eq(importJobs.id, row.id), eq(importJobs.status, "failed")))
		.returning();
	if (!claimed) return { ok: false, status: 409, error: "Only a failed import can be resumed" };
	await enqueue(env, { kind: "import.run", jobId: row.id });
	return { ok: true, job: toImportJobSummary(claimed) };
}

export async function processImportJob(env: CloudflareEnv, delivered: ImportJobMessage): Promise<void> {
	const db = getDb(env);
	const [job] = await db.select().from(importJobs).where(eq(importJobs.id, delivered.jobId)).limit(1);
	if (!job || (job.status !== "queued" && job.status !== "running")) return;

	if (job.status === "queued") {
		await db
			.update(importJobs)
			.set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
			.where(and(eq(importJobs.id, job.id), eq(importJobs.status, "queued")));
	}

	let chunk: Chunk;
	try {
		chunk = await runFileChunk(env, job);
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Import failed";
		const now = new Date();
		await db
			.update(importJobs)
			.set({ status: "failed", error: reason, finishedAt: now, updatedAt: now })
			.where(and(eq(importJobs.id, job.id), inArray(importJobs.status, [...ACTIVE])));
		return;
	}

	const existingErrors = parseJson<string[]>(job.errors, []);
	const combinedErrors = [...existingErrors, ...chunk.result.errors].slice(0, MAX_STORED_ERRORS);
	const processed = job.processed + chunk.result.imported + chunk.result.skipped;
	const imported = job.imported + chunk.result.imported;
	const skipped = job.skipped + chunk.result.skipped;
	const errorCount = job.errorCount + chunk.result.errors.length;
	const total = job.total + chunk.totalDelta;
	const finished = chunk.done || (total > 0 && processed >= total);
	const now = new Date();

	const [updated] = await db
		.update(importJobs)
		.set({
			status: finished ? "completed" : "running",
			total,
			processed,
			imported,
			skipped,
			errors: JSON.stringify(combinedErrors),
			errorCount,
			cursor: JSON.stringify(chunk.cursor),
			finishedAt: finished ? now : null,
			updatedAt: now,
		})
		.where(and(eq(importJobs.id, job.id), inArray(importJobs.status, [...ACTIVE])))
		.returning({ id: importJobs.id });

	if (chunk.consumedKey) {
		await env.BUCKET.delete(chunk.consumedKey).catch(() => {});
	}

	if (!updated) return;

	if (finished) {
		await cleanupJob(env, job);
		return;
	}

	await enqueue(env, { kind: "import.run", jobId: job.id });
}

async function getImportUserId(env: CloudflareEnv, job: JobRow, destinationValue: string): Promise<string> {
	const [mailbox] = await getDb(env)
		.select({ userId: mailboxes.userId })
		.from(mailboxes)
		.where(eq(mailboxes.id, job.mailboxId))
		.limit(1);
	if (!mailbox) throw new Error("Mailbox no longer exists");
	return getImportMessageUserId(parseImportDestination(destinationValue), job.userId, mailbox.userId);
}

async function runFileChunk(env: CloudflareEnv, job: JobRow): Promise<Chunk> {
	const spec = parseJson<FileImportSpec>(job.spec, { destination: "", batches: 0 });
	const cursor = parseJson<FileImportCursor>(job.cursor, { batch: 0 });
	const key = importBatchKey(job.id, cursor.batch);
	const object = await env.BUCKET.get(key);
	if (!object) throw new Error("Uploaded files are no longer available; upload them again");
	const messages = unpackImportMessages(new Uint8Array(await object.arrayBuffer()));
	const result = await importMessagesToMailbox(env, {
		userId: await getImportUserId(env, job, spec.destination),
		mailboxId: job.mailboxId,
		destination: parseImportDestination(spec.destination),
		messages,
	});
	const next = cursor.batch + 1;
	return { result, cursor: { batch: next }, totalDelta: 0, done: next >= spec.batches, consumedKey: key };
}

export async function sweepImportJobs(env: CloudflareEnv, now = new Date()): Promise<void> {
	const db = getDb(env);
	const stale = await db
		.select()
		.from(importJobs)
		.where(and(inArray(importJobs.status, [...ACTIVE]), lt(importJobs.updatedAt, new Date(now.getTime() - STALE_AFTER_MS))));
	for (const row of stale) {
		await db
			.update(importJobs)
			.set({ status: "failed", error: "Import was interrupted", finishedAt: now, updatedAt: now })
			.where(and(eq(importJobs.id, row.id), inArray(importJobs.status, [...ACTIVE])));
	}
	const expired = and(
		inArray(importJobs.status, ["completed", "failed", "cancelled"]),
		lt(importJobs.finishedAt, new Date(now.getTime() - KEEP_FINISHED_MS)),
	);
	const old = await db.select().from(importJobs).where(expired);
	for (const row of old) await cleanupJob(env, row);
	await db.delete(importJobs).where(expired);
}
