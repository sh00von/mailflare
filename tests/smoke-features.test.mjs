import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { isDisposableEmail } from "@visulima/disposable-email-domains";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(root, "tests", ".tmp-smoke-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: {
		passwordResetUtils: join(root, "src/lib/auth/password-reset-utils.ts"),
		plansCatalog: join(root, "src/lib/plans/catalog.ts"),
	},
	outdir: outDir,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	alias: { "@": join(root, "src") },
	packages: "external",
	logLevel: "silent",
});

const { buildPasswordResetEmail } = await import(pathToFileURL(join(outDir, "passwordResetUtils.mjs")).href);
const {
	PLANS,
	PLAN_LIST,
	TRIAL_DAYS,
	calculatePlanPricing,
	resolvePlanId,
	resolveBillingCycle,
} = await import(pathToFileURL(join(outDir, "plansCatalog.mjs")).href);

test("disposable email detection works with @visulima/disposable-email-domains", () => {
	assert.equal(isDisposableEmail("user@mailinator.com"), true);
	assert.equal(isDisposableEmail("user@tempmail.com"), true);
	assert.equal(isDisposableEmail("user@10minutemail.com"), true);
	assert.equal(isDisposableEmail("user@gmail.com"), false);
	assert.equal(isDisposableEmail("user@outlook.com"), false);
	assert.equal(isDisposableEmail("user@mycompany.org"), false);
});

test("password reset email generator outputs valid responsive html and link", () => {
	const result = buildPasswordResetEmail({
		email: "test@example.com",
		appName: "Mailflare",
		link: "https://mailflare.app/reset-password?token=prt_12345",
		minutes: 30,
	});
	assert.ok(result.subject.includes("Mailflare"));
	assert.ok(result.html.includes("Reset Password"));
	assert.ok(result.html.includes("https://mailflare.app/reset-password?token=prt_12345"));
	assert.ok(result.html.includes("30 minutes"));
	assert.ok(result.text.includes("test@example.com"));
});

test("subscription catalog defines 4 tiers with 14-day trial", () => {
	assert.equal(TRIAL_DAYS, 14);
	assert.equal(PLAN_LIST.length, 4);

	// Free tier
	assert.equal(PLANS.free.priceMonthlyUsd, 0);
	assert.equal(PLANS.free.maxMailboxes, 1);
	assert.equal(PLANS.free.maxDomains, 1);

	// Starter tier ($1.99/mo or $19/yr)
	assert.equal(PLANS.starter.priceMonthlyUsd, 1.99);
	assert.equal(PLANS.starter.priceAnnualUsd, 19.0);
	assert.equal(PLANS.starter.maxMailboxes, 2);
	assert.equal(PLANS.starter.maxDomains, 1);

	// Pro tier ($4.99/mo or $49/yr)
	assert.equal(PLANS.pro.priceMonthlyUsd, 4.99);
	assert.equal(PLANS.pro.priceAnnualUsd, 49.0);
	assert.equal(PLANS.pro.maxMailboxes, 5);
	assert.equal(PLANS.pro.maxDomains, 3);
	assert.equal(PLANS.pro.highlighted, true);

	// Business tier ($9.99/mo or $99/yr)
	assert.equal(PLANS.business.priceMonthlyUsd, 9.99);
	assert.equal(PLANS.business.priceAnnualUsd, 99.0);
	assert.equal(PLANS.business.maxMailboxes, 15);
	assert.equal(PLANS.business.maxDomains, 10);
});

test("calculatePlanPricing applies monthly and annual calculations with discounts", () => {
	const freeMonthly = calculatePlanPricing("free", "monthly");
	assert.equal(freeMonthly.totalCharged, 0);

	const starterMonthly = calculatePlanPricing("starter", "monthly");
	assert.equal(starterMonthly.totalCharged, 1.99);
	assert.equal(starterMonthly.monthlyEquivalent, 1.99);

	const starterYearly = calculatePlanPricing("starter", "yearly");
	assert.equal(starterYearly.totalCharged, 19.0);
	assert.equal(starterYearly.discountPct >= 15, true);

	const proYearly = calculatePlanPricing("pro", "yearly");
	assert.equal(proYearly.totalCharged, 49.0);
	assert.equal(proYearly.monthlyEquivalent, 4.08);

	assert.equal(resolvePlanId("starter"), "starter");
	assert.equal(resolvePlanId("free"), "free");
	assert.equal(resolvePlanId("unknown"), "pro");

	assert.equal(resolveBillingCycle("yearly"), "yearly");
	assert.equal(resolveBillingCycle("12m"), "yearly");
	assert.equal(resolveBillingCycle("monthly"), "monthly");
});
