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

const { PLANS, PLAN_LIST, ADDONS_CATALOG, WORKSPACE_PLAN, resolvePlanId, calculateWorkspacePricing, MIN_MAILBOXES } = await import(pathToFileURL(outfile).href);

test("unified workspace plan offers 5 mailboxes, 5 domains, and 1 GB per mailbox", () => {
	assert.ok(PLAN_LIST.length >= 1);
	const plan = WORKSPACE_PLAN;
	assert.equal(plan.name, "Replyot Workspace");
	assert.equal(plan.maxMailboxes, 5);
	assert.equal(plan.maxDomains, 5);
	assert.equal(plan.dailySendLimit, 500); // Gmail matched
	assert.equal(plan.hourlySendLimit, 100);
	assert.equal(plan.storagePerMailboxBytes, 1024 ** 3); // 1 GB per mailbox
	assert.equal(plan.storageLimitBytes, 5 * 1024 ** 3); // 5 GB workspace
	assert.equal(plan.priceQuarterlyUsd, 9.0);
	assert.equal(plan.priceSemiAnnualUsd, 16.5);
	assert.equal(plan.priceAnnualUsd, 30.0);
});

test("calculateWorkspacePricing enforces minimum 5 mailboxes and calculates dynamic pricing correctly", () => {
	assert.equal(MIN_MAILBOXES, 5);

	// Enforces minimum 5 mailboxes when < 5 requested
	const minCalc = calculateWorkspacePricing(2, "12m");
	assert.equal(minCalc.mailboxes, 5);
	assert.equal(minCalc.pricePerMailboxMonthly, 0.5);
	assert.equal(minCalc.totalMonthlyEquivalent, 2.5);
	assert.equal(minCalc.totalCharged, 30.0);
	assert.equal(minCalc.storageGb, 5);

	// 10 mailboxes on 12m ($0.50/mailbox/mo = $5/mo = $60/yr)
	const annual10 = calculateWorkspacePricing(10, "12m");
	assert.equal(annual10.mailboxes, 10);
	assert.equal(annual10.totalMonthlyEquivalent, 5.0);
	assert.equal(annual10.totalCharged, 60.0);
	assert.equal(annual10.storageGb, 10);

	// 5 mailboxes on 6m ($0.55/mailbox/mo = $2.75/mo = $16.50/6mo)
	const semi5 = calculateWorkspacePricing(5, "6m");
	assert.equal(semi5.totalMonthlyEquivalent, 2.75);
	assert.equal(semi5.totalCharged, 16.5);

	// 8 mailboxes on 3m ($0.60/mailbox/mo = $4.80/mo = $14.40/3mo)
	const q8 = calculateWorkspacePricing(8, "3m");
	assert.equal(q8.mailboxes, 8);
	assert.equal(q8.pricePerMailboxMonthly, 0.6);
	assert.equal(q8.totalMonthlyEquivalent, 4.8);
	assert.equal(q8.totalCharged, 14.4);
	assert.equal(q8.storageGb, 8);
});

test("add-on catalog provides extra storage and team mailboxes", () => {
	assert.ok(Array.isArray(ADDONS_CATALOG) && ADDONS_CATALOG.length >= 2);
	const storageAddon = ADDONS_CATALOG.find((a) => a.id === "addon_mailbox_storage_1gb");
	const mailboxAddon = ADDONS_CATALOG.find((a) => a.id === "addon_mailbox_1gb");
	assert.ok(storageAddon);
	assert.ok(mailboxAddon);
	assert.equal(storageAddon.priceQuarterlyUsd, 1.0);
	assert.equal(mailboxAddon.priceQuarterlyUsd, 1.5);
});

test("resolvePlanId falls back to pro workspace for unknown or empty values", () => {
	assert.equal(resolvePlanId("starter"), "starter");
	assert.equal(resolvePlanId("pro"), "pro");
	assert.equal(resolvePlanId("business"), "business");
	assert.equal(resolvePlanId("free"), "pro");
	assert.equal(resolvePlanId(undefined), "pro");
	rmSync(outDir, { recursive: true, force: true });
});
