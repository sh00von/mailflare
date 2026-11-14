// Undo of moves against a real PostgreSQL (PGlite, in memory) with the app's own migrations: Spam / Not spam
// training must be reverted exactly, and restore must refuse forged targets.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = mkdtempSync(join(root, "node_modules", "replyot-spam-undo-test-"));
after(() => rmSync(directory, { recursive: true, force: true }));

// The schema module picks its dialect from the environment when first imported.
process.env.REPLYOT_DB_DIALECT = "postgres";
process.env.DATABASE_URL = "pglite://memory";

await build({
	stdin: {
		contents: `
			export { withDatabase } from "./src/db/with-database.ts";
			export { applyPendingMigrations } from "./src/lib/migrations/service.ts";
			export { applySpamFeedback, revertSpamFeedback } from "./src/lib/spam/feedback.ts";
			export { readPlacements, restoreMessagePlacements } from "./src/app/api/messages/bulk/restore.ts";
			export { getDb } from "./src/db/index.ts";
			export { messages } from "./src/db/schema/index.ts";
		`,
		resolveDir: root,
		sourcefile: "spam-undo-test-entry.ts",
	},
	outfile: join(directory, "entry.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	packages: "external",
	logLevel: "silent",
	// The route helper only needs NextResponse.json, which is the standard Response.json outside Next.
	plugins: [{
		name: "next-server-shim",
		setup(builder) {
			builder.onResolve({ filter: /^next\/server$/ }, () => ({ path: "next-server", namespace: "shim" }));
			builder.onLoad({ filter: /.*/, namespace: "shim" }, () => ({ contents: "export const NextResponse = { json: (body, init) => Response.json(body, init) };", loader: "js" }));
		},
	}],
});
const m = await import(pathToFileURL(join(directory, "entry.mjs")).href);

const env = m.withDatabase({ DATABASE_URL: "pglite://memory", REPLYOT_RUNTIME: "node" });
const owner = { id: "u1", role: "admin", isPrimaryAdmin: true };
const stranger = { id: "u2", role: "admin", isPrimaryAdmin: false };

async function run(sql, ...values) {
	await env.DB.prepare(sql).bind(...values).run();
}
async function all(sql, ...values) {
	return (await env.DB.prepare(sql).bind(...values).all()).results;
}
/** Everything the spam filter learned, in a stable order. */
async function training() {
	return {
		tokens: await all("SELECT mailbox_id, token, spam_count, ham_count FROM spam_token_stats ORDER BY mailbox_id, token"),
		reputation: await all("SELECT mailbox_id, type, key, spam_count, ham_count FROM spam_reputation ORDER BY mailbox_id, type, key"),
		feedback: await all("SELECT message_id, classification FROM spam_feedback ORDER BY message_id"),
	};
}
async function placementOf(id) {
	const [row] = await all("SELECT status, folder_id FROM messages WHERE id = ?", id);
	return row;
}
async function addMessage(id, { direction = "inbound", status = "received", folderId = null } = {}) {
	await run(
		"INSERT INTO messages (id, user_id, mailbox_id, direction, status, folder_id, from_addr, to_addr, subject, text_body, created_at) VALUES (?, 'u1', 'mb1', ?, ?, ?, ?, 'kevin@example.com', ?, ?, ?)",
		id, direction, status, folderId, direction === "inbound" ? "deals@promo-blast.example" : "kevin@example.com",
		"Limited offer: win a prize now", "Click here to claim your free prize today, act now before it expires.", Math.floor(Date.now() / 1000),
	);
}

before(async () => {
	await m.applyPendingMigrations(env.DB);
	const now = Math.floor(Date.now() / 1000);
	await run("INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u1', 'kevin@example.com', 'Kevin', 'x', ?)", now);
	await run("INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u2', 'mallory@example.org', 'Mallory', 'x', ?)", now);
	await run("INSERT INTO domains (id, user_id, hostname, zone_id, created_at) VALUES ('d1', 'u1', 'example.com', 'manual', ?)", now);
	await run("INSERT INTO mailboxes (id, user_id, domain_id, local_part, created_at) VALUES ('mb1', 'u1', 'd1', 'kevin', ?)", now);
	await run("INSERT INTO mailboxes (id, user_id, domain_id, local_part, created_at) VALUES ('mb2', 'u1', 'd1', 'other', ?)", now);
	await run("INSERT INTO folders (id, user_id, mailbox_id, name, created_at) VALUES ('f1', 'u1', 'mb1', 'Receipts', ?)", now);
	await run("INSERT INTO folders (id, user_id, mailbox_id, name, created_at) VALUES ('f2', 'u1', 'mb2', 'Elsewhere', ?)", now);
});

test("Undo of Mark as spam leaves the spam filter exactly as it was", async () => {
	await addMessage("m-spam");
	const db = m.getDb(env);
	const before = await training();
	const [row] = await db.select().from(m.messages).where((await import("drizzle-orm")).eq(m.messages.id, "m-spam"));
	const previous = await m.readPlacements(db, [row]);
	assert.deepEqual(previous.map(({ id, status, folderId, spamClassification }) => ({ id, status, folderId, spamClassification })), [
		{ id: "m-spam", status: "received", folderId: null, spamClassification: null },
	]);

	assert.equal(await m.applySpamFeedback(env, owner, "m-spam", "spam"), true);
	const trained = await training();
	assert.ok(trained.tokens.length > 0, "marking spam trains tokens");
	assert.equal((await placementOf("m-spam")).status, "spam");

	const response = await m.restoreMessagePlacements(env, owner, previous);
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true, restored: 1, skipped: 0 });
	assert.equal((await placementOf("m-spam")).status, "received");
	const after = await training();
	assert.deepEqual(after.feedback, before.feedback, "feedback row removed");
	// Rows created by the click remain with zero counts; nothing learned survives.
	assert.ok(after.tokens.every((token) => token.spam_count === 0 && token.ham_count === 0), "token counts back to zero");
	assert.ok(after.reputation.every((item) => item.spam_count === 0 && item.ham_count === 0), "reputation back to zero");
});

test("Undo of Not spam restores the earlier Spam training, not a blank slate", async () => {
	await addMessage("m-flip", { status: "spam" });
	await m.applySpamFeedback(env, owner, "m-flip", "spam");
	const markedSpam = await training();
	const db = m.getDb(env);
	const { eq } = await import("drizzle-orm");
	const previous = await m.readPlacements(db, await db.select().from(m.messages).where(eq(m.messages.id, "m-flip")));
	assert.equal(previous[0].spamClassification, "spam");

	await m.applySpamFeedback(env, owner, "m-flip", "ham");
	assert.equal((await placementOf("m-flip")).status, "received");

	const response = await m.restoreMessagePlacements(env, owner, previous);
	assert.equal(response.status, 200);
	assert.equal((await placementOf("m-flip")).status, "spam");
	assert.deepEqual(await training(), markedSpam, "training identical to before the Not spam click");
});

test("restore puts status and folder back for inbound and sent mail", async () => {
	await addMessage("m-in", { status: "received", folderId: "f1" });
	await addMessage("m-out", { direction: "outbound", status: "sent" });
	const items = [
		{ id: "m-in", status: "received", folderId: "f1", snoozedUntil: null, spamClassification: null },
		{ id: "m-out", status: "sent", folderId: null, snoozedUntil: null, spamClassification: null },
	];
	await run("UPDATE messages SET status = 'archived', folder_id = NULL WHERE id IN ('m-in', 'm-out')");
	const response = await m.restoreMessagePlacements(env, owner, items);
	assert.deepEqual(await response.json(), { ok: true, restored: 2, skipped: 0 });
	assert.deepEqual(await placementOf("m-in"), { status: "received", folder_id: "f1" });
	assert.deepEqual(await placementOf("m-out"), { status: "sent", folder_id: null });
});

test("restore refuses forged statuses, foreign folders and other people's mail", async () => {
	await addMessage("m-guard", { status: "archived" });
	const base = { id: "m-guard", folderId: null, snoozedUntil: null, spamClassification: null };
	for (const forged of [
		{ ...base, status: "sent" },
		{ ...base, status: "draft" },
		{ ...base, status: "received", folderId: "f2" },
	]) {
		const response = await m.restoreMessagePlacements(env, owner, [forged]);
		assert.equal(response.status, 409, JSON.stringify(forged));
	}
	const response = await m.restoreMessagePlacements(env, stranger, [{ ...base, status: "received" }]);
	assert.equal(response.status, 409);
	assert.equal((await placementOf("m-guard")).status, "archived", "nothing changed");

	const malformed = await m.restoreMessagePlacements(env, owner, [{ id: "m-guard", status: "received" }]);
	assert.equal(malformed.status, 400);
});
