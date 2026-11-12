import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "replyot-prod-"));
const outfile = join(outDir, "usage.mjs");
const stripeOutfile = join(outDir, "stripe.mjs");

await Promise.all([
	build({
		entryPoints: [join(root, "src/lib/plans/usage.ts")],
		outfile,
		bundle: true,
		format: "esm",
		platform: "node",
		alias: { "@": join(root, "src") },
	}),
	build({
		entryPoints: [join(root, "src/lib/billing/stripe.ts")],
		outfile: stripeOutfile,
		bundle: true,
		format: "esm",
		platform: "node",
		alias: { "@": join(root, "src") },
	}),
]);

const { isSameWorkspace } = await import(pathToFileURL(outfile).href);
const { verifyStripeWebhookSignature, mapStripeSubscriptionStatus } = await import(
	pathToFileURL(stripeOutfile).href
);
test.after(() => rmSync(outDir, { recursive: true, force: true }));

test("isSameWorkspace enforces tenant isolation for non-primary workspace admins", () => {
	assert.equal(isSameWorkspace({ id: "u1", isPrimaryAdmin: true, workspaceId: "ws1" }, { id: "u2", workspaceId: "ws2" }), true);
	assert.equal(isSameWorkspace({ id: "u1", isPrimaryAdmin: false, workspaceId: "ws1" }, { id: "u2", workspaceId: "ws1" }), true);
	assert.equal(isSameWorkspace({ id: "u1", isPrimaryAdmin: false, workspaceId: "ws1" }, { id: "u1", workspaceId: "ws2" }), true);
	assert.equal(isSameWorkspace({ id: "u1", isPrimaryAdmin: false, workspaceId: "ws1" }, { id: "u2", workspaceId: "ws2" }), false);
	assert.equal(isSameWorkspace({ id: "u1", isPrimaryAdmin: false, workspaceId: null }, { id: "u2", workspaceId: "ws2" }), false);
});

test("public auth and DNS setup endpoints enforce IP rate limiting", () => {
	for (const path of [
		"src/app/api/setup/domain/route.ts",
		"src/app/api/setup/domain/mx/route.ts",
		"src/app/api/auth/register/route.ts",
		"src/app/api/auth/password-reset/request/route.ts",
	]) {
		const content = readFileSync(join(root, path), "utf8");
		assert.match(content, /allowLoginAttempt/, `${path} must call allowLoginAttempt`);
		assert.match(content, /429/, `${path} must return 429 when rate limited`);
	}
});

test("inbound mail intake checks workspace storage & suspension before S3 write", () => {
	const content = readFileSync(join(root, "src/lib/email/intake.ts"), "utf8");
	const checkIdx = content.indexOf("checkCanReceiveStorage");
	const putIdx = content.indexOf("env.BUCKET.put");
	assert.ok(checkIdx !== -1, "intake.ts must call checkCanReceiveStorage");
	assert.ok(putIdx !== -1 && checkIdx < putIdx, "checkCanReceiveStorage must run before env.BUCKET.put");
});

test("healthcheck and SES auto-provisioning modules exist", () => {
	const health = readFileSync(join(root, "src/app/api/health/route.ts"), "utf8");
	assert.match(health, /SELECT 1/);
	const ses = readFileSync(join(root, "src/lib/email/ses-domain-setup.ts"), "utf8");
	assert.match(ses, /ensureSesSendingDomain/);
});

test("verifyStripeWebhookSignature validates HMAC-SHA256 signatures and timestamps", async () => {
	const secret = "whsec_test_secret_123";
	const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
	const now = Math.floor(Date.now() / 1000);
	const sign = (ts, body) =>
		createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

	const validHeader = `t=${now},v1=${sign(now, payload)}`;
	assert.equal(await verifyStripeWebhookSignature(payload, validHeader, secret), true);
	assert.equal(await verifyStripeWebhookSignature(payload, `t=${now},v1=${"0".repeat(64)}`, secret), false);
	assert.equal(await verifyStripeWebhookSignature(payload, null, secret), false);

	const expiredTs = now - 600;
	const expiredHeader = `t=${expiredTs},v1=${sign(expiredTs, payload)}`;
	assert.equal(await verifyStripeWebhookSignature(payload, expiredHeader, secret, 300), false);
});

test("mapStripeSubscriptionStatus maps Stripe statuses to workspace statuses", () => {
	assert.equal(mapStripeSubscriptionStatus("active"), "active");
	assert.equal(mapStripeSubscriptionStatus("trialing"), "trialing");
	assert.equal(mapStripeSubscriptionStatus("past_due"), "suspended");
	assert.equal(mapStripeSubscriptionStatus("unpaid"), "suspended");
	assert.equal(mapStripeSubscriptionStatus("canceled"), "suspended");
});
