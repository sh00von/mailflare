import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({ entryPoints: ["src/lib/notify-utils.ts"], bundle: true, write: false, platform: "neutral", format: "esm" });
const { toUserMessage, isUserFacingText, toastIdFor, NETWORK_ERROR_MESSAGE, DEFAULT_ERROR_MESSAGE } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("plain-language server and thrown messages are shown as written", () => {
	assert.equal(toUserMessage({ error: "This domain is already in use." }, "Could not add domain"), "This domain is already in use.");
	assert.equal(toUserMessage(new Error("Folder not found"), "Could not move"), "Folder not found");
	assert.equal(toUserMessage("  Mailbox limit reached  ", "x"), "Mailbox limit reached");
});

test("network failures always get the connection message", () => {
	assert.equal(toUserMessage(new TypeError("Failed to fetch"), "Could not save"), NETWORK_ERROR_MESSAGE);
	assert.equal(toUserMessage(new TypeError("Load failed"), "Could not save"), NETWORK_ERROR_MESSAGE);
	assert.equal(toUserMessage(new TypeError("NetworkError when attempting to fetch resource."), "x"), NETWORK_ERROR_MESSAGE);
});

test("technical text is replaced by the caller's fallback", () => {
	for (const technical of [
		"Failed query: select * from messages where id = $1",
		"SQLITE_CONSTRAINT: UNIQUE constraint failed",
		"Cannot read properties of undefined (reading 'id')",
		"connect ECONNREFUSED 127.0.0.1:5432",
		"Internal Server Error",
		"x is not a function",
		"line one\nline two",
		"a".repeat(201),
		"ok",
	]) {
		assert.equal(toUserMessage(technical, "Could not save settings"), "Could not save settings", technical);
	}
	assert.equal(isUserFacingText("Saved"), true);
});

test("zod flatten() bodies use the first readable error", () => {
	assert.equal(toUserMessage({ error: { formErrors: ["Name is required"], fieldErrors: {} } }, "x"), "Name is required");
	assert.equal(toUserMessage({ error: { formErrors: [], fieldErrors: { hostname: ["Enter a valid domain"] } } }, "x"), "Enter a valid domain");
	assert.equal(toUserMessage({ error: { formErrors: [], fieldErrors: {} } }, "Fallback"), "Fallback");
});

test("status codes give a specific line when the body has nothing readable", () => {
	assert.equal(toUserMessage(null, "x", 429), "Too many attempts. Wait a minute and try again.");
	assert.equal(toUserMessage({ error: "Internal Server Error" }, "x", 403), "You don't have permission to do that.");
	assert.equal(toUserMessage({ error: "Plan limit reached" }, "x", 403), "Plan limit reached");
	assert.equal(toUserMessage(undefined), DEFAULT_ERROR_MESSAGE);
});

test("identical messages share an id so they replace instead of stacking", () => {
	assert.equal(toastIdFor("success", "Archived"), toastIdFor("success", "Archived"));
	assert.notEqual(toastIdFor("success", "Archived"), toastIdFor("error", "Archived"));
});

test("only the notify module and the Toaster import sonner", () => {
	const allowed = new Set(["src/lib/notify.ts", "src/components/ui/sonner.tsx"]);
	const offenders = [];
	const walk = (dir) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (/\.(ts|tsx|mts|js|jsx)$/.test(name) && /from\s+["']sonner["']/.test(readFileSync(path, "utf8"))) {
				const relative = path.replaceAll("\\", "/");
				if (!allowed.has(relative)) offenders.push(relative);
			}
		}
	};
	walk("src");
	assert.deepEqual(offenders, [], "use notify from @/lib/notify");
});
