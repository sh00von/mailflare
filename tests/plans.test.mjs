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
	alias: { "@": join(root, "src") },
	logLevel: "silent",
});

const {
	PLANS,
	PLAN_LIST,
	PAID_PLAN_LIST,
	ADDONS_CATALOG,
	ADDON_LIST,
	resolvePlanId,
	resolveAddonId,
	getPlanDefinition,
	getAddonDefinition,
	calculatePlanPricing,
	calculateAddonPricing,
} = await import(pathToFileURL(outfile).href);

test("subscription catalog defines 4 tiers with Option B pricing", () => {
	assert.equal(PLAN_LIST.length, 4);
	assert.equal(PAID_PLAN_LIST.length, 3);

	// Starter: $2.99/mo, $29.00/yr, 2 mailboxes, 1 domain
	assert.equal(PLANS.starter.priceMonthlyUsd, 2.99);
	assert.equal(PLANS.starter.priceAnnualUsd, 29.0);
	assert.equal(PLANS.starter.maxMailboxes, 2);
	assert.equal(PLANS.starter.maxDomains, 1);

	// Pro: $6.99/mo, $69.00/yr, 5 mailboxes, 3 domains
	assert.equal(PLANS.pro.priceMonthlyUsd, 6.99);
	assert.equal(PLANS.pro.priceAnnualUsd, 69.0);
	assert.equal(PLANS.pro.maxMailboxes, 5);
	assert.equal(PLANS.pro.maxDomains, 3);
	assert.equal(PLANS.pro.highlighted, true);

	// Business: $9.99/mo, $99.00/yr, 15 mailboxes, 10 domains
	assert.equal(PLANS.business.priceMonthlyUsd, 9.99);
	assert.equal(PLANS.business.priceAnnualUsd, 99.0);
	assert.equal(PLANS.business.maxMailboxes, 15);
	assert.equal(PLANS.business.maxDomains, 10);
});

test("calculatePlanPricing applies monthly and annual calculations with discounts", () => {
	const starterMonthly = calculatePlanPricing("starter", "monthly");
	assert.equal(starterMonthly.totalCharged, 2.99);
	assert.equal(starterMonthly.monthlyEquivalent, 2.99);
	assert.equal(starterMonthly.discountPct, 0);

	const starterYearly = calculatePlanPricing("starter", "yearly");
	assert.equal(starterYearly.totalCharged, 29.0);
	assert.equal(starterYearly.monthlyEquivalent, 2.42);
	assert.ok(starterYearly.discountPct >= 15);

	const proYearly = calculatePlanPricing("pro", "yearly");
	assert.equal(proYearly.totalCharged, 69.0);
	assert.equal(proYearly.monthlyEquivalent, 5.75);
	assert.ok(proYearly.discountPct >= 15);
});

test("add-on catalog provides modular mailbox and storage upgrades", () => {
	assert.ok(Array.isArray(ADDONS_CATALOG) && ADDONS_CATALOG.length === 2);
	assert.equal(ADDONS_CATALOG, ADDON_LIST);

	const mailboxAddon = getAddonDefinition("addon_mailboxes");
	assert.ok(mailboxAddon);
	assert.equal(mailboxAddon.name, "+5 Team Mailboxes");
	assert.equal(mailboxAddon.priceMonthlyUsd, 3.0);
	assert.equal(mailboxAddon.priceAnnualUsd, 30.0);
	assert.equal(mailboxAddon.extraMailboxes, 5);

	const storageAddon = getAddonDefinition("addon_storage");
	assert.ok(storageAddon);
	assert.equal(storageAddon.name, "+20 GB Storage");
	assert.equal(storageAddon.priceMonthlyUsd, 2.5);
	assert.equal(storageAddon.priceAnnualUsd, 25.0);
	assert.equal(storageAddon.extraStorageGb, 20);

	// Addon pricing calculations
	const mbCalc = calculateAddonPricing("addon_mailboxes", "yearly");
	assert.equal(mbCalc.totalCharged, 30.0);
	assert.equal(mbCalc.monthlyEquivalent, 2.5);

	const stCalc = calculateAddonPricing("addon_storage", "monthly");
	assert.equal(stCalc.totalCharged, 2.5);
	assert.equal(stCalc.monthlyEquivalent, 2.5);

	assert.equal(resolveAddonId("addon_mailboxes"), "addon_mailboxes");
	assert.equal(resolveAddonId("addon_storage"), "addon_storage");
	assert.equal(resolveAddonId("unknown"), null);
});

test("resolvePlanId handles valid plans and falls back to pro workspace", () => {
	assert.equal(resolvePlanId("starter"), "starter");
	assert.equal(resolvePlanId("pro"), "pro");
	assert.equal(resolvePlanId("business"), "business");
	assert.equal(resolvePlanId("free"), "free");
	assert.equal(resolvePlanId(undefined), "pro");
	assert.equal(resolvePlanId("invalid"), "pro");
	rmSync(outDir, { recursive: true, force: true });
});
