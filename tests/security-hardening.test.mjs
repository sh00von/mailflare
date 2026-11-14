import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = mkdtempSync(join(root, "node_modules", "replyot-security-test-"));
after(() => rmSync(directory, { recursive: true, force: true }));
await build({
	stdin: {
		contents: `
			export { spfAuthorises, checkDomainOwnershipDns, DomainOwnershipError } from "./src/lib/domains/ownership.ts";
			export { reserveSecondFactorAttempt, clearSecondFactorFailures, resetSecondFactorAttempts, MAX_FAILURES_PER_CHALLENGE, MAX_FAILURES_PER_USER } from "./src/lib/auth/mfa-attempts.ts";
			export { publicOnlyFetch } from "./src/lib/security/public-fetch.ts";
		`,
		resolveDir: root,
		sourcefile: "security-test-entry.ts",
	},
	outfile: join(directory, "entry.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	packages: "external",
	logLevel: "silent",
});
const m = await import(pathToFileURL(join(directory, "entry.mjs")).href);

test("SPF must name our host exactly, not merely contain it", () => {
	const host = "mx.replyot.com";
	assert.equal(m.spfAuthorises("v=spf1 include:mx.replyot.com -all", host, false), true);
	assert.equal(m.spfAuthorises("v=spf1 a:mx.replyot.com ~all", host, false), true);
	assert.equal(m.spfAuthorises("v=spf1 mx -all", host, true), true);
	assert.equal(m.spfAuthorises("v=spf1 mx -all", host, false), false);
	assert.equal(m.spfAuthorises("v=spf1 include:evil-mx.replyot.com.attacker.net -all", host, false), false);
	assert.equal(m.spfAuthorises("v=spf1 include:notmx.replyot.com -all", host, false), false);
	assert.equal(m.spfAuthorises("v=spf2 include:mx.replyot.com", host, false), false);
});

test("ownership cannot be proven without MAIL_HOSTNAME (no mail.<domain> fallback)", async () => {
	const saved = process.env.MAIL_HOSTNAME;
	delete process.env.MAIL_HOSTNAME;
	try {
		const check = await m.checkDomainOwnershipDns("example.com");
		assert.equal(check.ok, false);
		assert.equal(check.unconfigured, true);
		assert.match(new m.DomainOwnershipError(check).message, /MAIL_HOSTNAME/);
	} finally {
		if (saved !== undefined) process.env.MAIL_HOSTNAME = saved;
	}
});

test("parallel second-factor guesses cannot exceed the cap", () => {
	m.resetSecondFactorAttempts();
	// Simulate many concurrent requests: each reserves before any of them finishes verifying.
	const results = Array.from({ length: 20 }, () => m.reserveSecondFactorAttempt("u1", "challenge-a"));
	assert.equal(results.filter((r) => r.allowed).length, m.MAX_FAILURES_PER_CHALLENGE);
	assert.equal(results[m.MAX_FAILURES_PER_CHALLENGE - 1].challengeExhausted, true);
	// The per-account cap holds across fresh challenges too.
	let allowed = m.MAX_FAILURES_PER_CHALLENGE;
	for (let i = 0; i < 20; i++) if (m.reserveSecondFactorAttempt("u1", `challenge-${i}`).allowed) allowed += 1;
	assert.equal(allowed, m.MAX_FAILURES_PER_USER);
	m.clearSecondFactorFailures("u1", "challenge-x");
	assert.equal(m.reserveSecondFactorAttempt("u1", "challenge-x").allowed, true, "a correct code resets the account count");
});

test("public-only fetch refuses non-public IP literals before connecting", async () => {
	for (const url of ["http://127.0.0.1:4008/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/", "http://[::ffff:127.0.0.1]/"]) {
		await assert.rejects(m.publicOnlyFetch(url), (error) => error.code === "ENOTPUBLIC", url);
	}
});
