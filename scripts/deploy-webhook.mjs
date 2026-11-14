#!/usr/bin/env node
import { execSync } from "node:child_process";

const IMAGE_TAG = process.env.IMAGE_TAG || "ghcr.io/sh00von/replyot:latest";
const WEBHOOK_URL =
	process.env.DOKPLOY_DEPLOY_WEBHOOK ||
	"http://103.42.4.218:3000/api/deploy/compose/4ZLECbgjlO9IUyZCbwvNb";

async function main() {
	console.log("🚀 Starting build & deploy to Dokploy...");

	// 1. Bundle database migrations
	console.log("📦 Bundling database migrations...");
	execSync("pnpm run db:bundle", { stdio: "inherit" });

	// 2. Build local Docker container for Linux/amd64
	console.log(`🐳 Building container image: ${IMAGE_TAG}...`);
	execSync(`docker build --platform linux/amd64 -t ${IMAGE_TAG} .`, { stdio: "inherit" });

	// 3. Push to GHCR
	console.log(`⬆️ Pushing image to registry: ${IMAGE_TAG}...`);
	execSync(`docker push ${IMAGE_TAG}`, { stdio: "inherit" });

	// 4. Trigger Dokploy Webhook
	console.log(`📡 Triggering Dokploy deploy webhook: ${WEBHOOK_URL}...`);
	try {
		const res = await fetch(WEBHOOK_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-github-event": "push",
			},
			body: JSON.stringify({
				ref: "refs/heads/main",
			}),
		});

		const text = await res.text();
		if (res.ok) {
			console.log(`✅ Dokploy Response (${res.status}): ${text}`);
			console.log("🎉 Dokploy is now pulling your pre-built image and updating your container!");
		} else {
			console.error(`⚠️ Webhook returned error (${res.status}): ${text}`);
			process.exit(1);
		}
	} catch (err) {
		console.error("❌ Failed to reach Dokploy webhook:", err instanceof Error ? err.message : err);
		process.exit(1);
	}
}

void main();
