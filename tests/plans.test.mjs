import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "replyot-plans-"));
const outfile = join(outDir, "catalog.mjs");

await build({
	entryPoints: [join(root, "src/lib/plans/catalog.ts")],
	outfile,
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
});

const { PLANS, PLAN_LIST, resolvePlanId } = await import(pathToFileURL(outfile).href);

test("3 paid plans exist with no free tier and strictly increasing limits", () => {
	assert.equal(PLAN_LIST.length, 3);
	assert.deepEqual(PLAN_LIST.map((p) => p.id), ["starter", "pro", "business"]);
	assert.ok(PLANS.starter.priceMonthlyUsd > 0);
	assert.ok(PLANS.starter.maxDomains < PLANS.pro.maxDomains && PLANS.pro.maxDomains < PLANS.business.maxDomains);
	assert.ok(PLANS.starter.maxMailboxes < PLANS.pro.maxMailboxes && PLANS.pro.maxMailboxes < PLANS.business.maxMailboxes);
	assert.ok(PLANS.starter.storageLimitBytes < PLANS.pro.storageLimitBytes && PLANS.pro.storageLimitBytes < PLANS.business.storageLimitBytes);
	assert.ok(PLANS.starter.dailySendLimit < PLANS.pro.dailySendLimit && PLANS.pro.dailySendLimit < PLANS.business.dailySendLimit);
});

test("resolvePlanId falls back to starter for unknown or empty values", () => {
	assert.equal(resolvePlanId("pro"), "pro");
	assert.equal(resolvePlanId("business"), "business");
	assert.equal(resolvePlanId("free"), "starter");
	assert.equal(resolvePlanId(undefined), "starter");
	rmSync(outDir, { recursive: true, force: true });
});

