import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

async function load(entry) {
	const bundle = await build({ entryPoints: [entry], bundle: true, write: false, platform: "neutral", format: "esm" });
	return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
}

const { isValidRestoreTarget, isBulkMoveAction, isAllowedBulkMessageAction } = await load("src/app/api/messages/bulk/utils.ts");
const { bulkActionToastLabel } = await load("src/components/messages/bulk-toast-utils.ts");

test("restore only targets places a move could have come from", () => {
	for (const status of ["received", "archived", "spam", "trash"]) assert.equal(isValidRestoreTarget("inbound", status, false), true, status);
	for (const status of ["sent", "archived", "trash"]) assert.equal(isValidRestoreTarget("outbound", status, false), true, status);
	// Sent mail moved into a custom folder carries `received`.
	assert.equal(isValidRestoreTarget("outbound", "received", true), true);
	assert.equal(isValidRestoreTarget("outbound", "received", false), false);
});

test("restore refuses forged or impossible targets", () => {
	assert.equal(isValidRestoreTarget("inbound", "sent", false), false);
	assert.equal(isValidRestoreTarget("outbound", "spam", false), false);
	for (const status of ["draft", "scheduled", "", "RECEIVED", null, 1]) {
		assert.equal(isValidRestoreTarget("inbound", status, false), false, String(status));
		assert.equal(isValidRestoreTarget("outbound", status, true), false, String(status));
	}
	assert.equal(isValidRestoreTarget("sideways", "received", false), false);
});

test("move actions are the ones that return placements; restore is an allowed action", () => {
	for (const action of ["archive", "trash", "spam", "inbox", "folder"]) assert.equal(isBulkMoveAction(action), true, action);
	for (const action of ["read", "unread", "delete", "restore"]) assert.equal(isBulkMoveAction(action), false, action);
	assert.equal(isAllowedBulkMessageAction("restore"), true);
});

test("toast labels: short for one, counted for many, none for visible changes", () => {
	assert.equal(bulkActionToastLabel("archive", { count: 1 }), "Archived");
	assert.equal(bulkActionToastLabel("archive", { count: 3, noun: "conversation" }), "3 conversations archived");
	assert.equal(bulkActionToastLabel("trash", { count: 2 }), "2 messages moved to Trash");
	assert.equal(bulkActionToastLabel("folder", { count: 1, folderName: "Receipts" }), "Moved to Receipts");
	assert.equal(bulkActionToastLabel("delete", { count: 4 }), "4 messages deleted forever");
	assert.equal(bulkActionToastLabel("read", { count: 5 }), null);
	assert.equal(bulkActionToastLabel("unread", { count: 1 }), null);
});

test("moving spam back to the inbox reads as Not spam", () => {
	const fromSpam = [{ id: "m1", status: "spam", folderId: null, snoozedUntil: null, spamClassification: null }];
	const fromArchive = [{ id: "m1", status: "archived", folderId: null, snoozedUntil: null, spamClassification: null }];
	assert.equal(bulkActionToastLabel("inbox", { count: 1, previous: fromSpam }), "Marked as not spam");
	assert.equal(bulkActionToastLabel("inbox", { count: 1, previous: fromArchive }), "Moved to Inbox");
});
