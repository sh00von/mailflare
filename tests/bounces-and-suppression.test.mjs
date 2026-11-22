import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(root, "tests", ".tmp-bounces-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: {
		bounces: join(root, "src/lib/email/bounces.ts"),
	},
	outdir: outDir,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
});

const { parseBounceReport } = await import(pathToFileURL(join(outDir, "bounces.mjs")).href);

test("parseBounceReport identifies RFC 3464 hard bounce", () => {
	const parsed = {
		id: "bounce-1",
		fromAddr: "mailer-daemon@mx.google.com",
		toAddr: "sender@mycompany.com",
		subject: "Delivery Status Notification (Failure)",
		text: `
The following message to <invalid-user@example.com> was undeliverable.
The transfer failed with the following error:
550 5.1.1 <invalid-user@example.com>: Recipient address rejected: User unknown

--Boundary_1
Content-Type: message/delivery-status

Reporting-MTA: dns; mx.google.com
Action: failed
Status: 5.1.1
Final-Recipient: rfc822; invalid-user@example.com
Diagnostic-Code: smtp; 550 5.1.1 User unknown
`,
	};

	const report = parseBounceReport(parsed);
	assert.equal(report.isBounce, true);
	assert.equal(report.recipient, "invalid-user@example.com");
	assert.equal(report.bounceType, "hard");
	assert.equal(report.status, "5.1.1");
	assert.ok(report.diagnosticCode?.includes("550 5.1.1"));
});

test("parseBounceReport identifies soft bounce mailbox full", () => {
	const parsed = {
		id: "bounce-2",
		fromAddr: "postmaster@mail.outlook.com",
		toAddr: "sender@mycompany.com",
		subject: "Undelivered Mail Returned to Sender",
		text: `
Action: delayed
Status: 4.2.2
Final-Recipient: rfc822; full-inbox@outlook.com
Diagnostic-Code: smtp; 452 4.2.2 Mailbox is full
`,
	};

	const report = parseBounceReport(parsed);
	assert.equal(report.isBounce, true);
	assert.equal(report.recipient, "full-inbox@outlook.com");
	assert.equal(report.bounceType, "soft");
	assert.equal(report.status, "4.2.2");
});

test("parseBounceReport returns false for regular non-bounce email", () => {
	const parsed = {
		id: "normal-1",
		fromAddr: "client@partner.com",
		toAddr: "sales@mycompany.com",
		subject: "Quarterly Review Meeting",
		text: "Hi team, please find the deck attached.",
	};

	const report = parseBounceReport(parsed);
	assert.equal(report.isBounce, false);
	assert.equal(report.recipient, undefined);
});
