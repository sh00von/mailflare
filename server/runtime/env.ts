import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "@/lib/config";
import { getDatabaseConfig, withDatabase } from "@/db/with-database";
import { withStorage } from "@/lib/storage";
import { openFileBucket } from "./file-bucket";
import { openMailer, type Mailer, type MailerConfig } from "./mailer";
import { openAssets, openRateLimiter } from "./misc";
import { openQueue, type MailflareQueue } from "./queue";
import { RealtimeHubRegistry } from "./realtime";
import type { NodeRuntime } from "./types";

function mailerConfig(): MailerConfig {
	const smtp =
		config.email.smtpUrl ??
		(config.email.postfixHost
			? `smtp://${config.email.postfixHost}:${config.email.postfixPort}`
			: config.isProduction || process.env.REPLYOT_RUNTIME === "node"
				? "smtp://postfix:25"
				: undefined);
	if (smtp) return { kind: "smtp", url: smtp };
	return { kind: "none" };
}

/**
 * Assemble a `CloudflareEnv` for the Node runtime from environment variables
 * and local resources. Everything the app reaches through `getEnv()` is here,
 * so application code does not know which platform it runs on.
 */
export function createNodeRuntime(): NodeRuntime {
	const dataDir = resolve(process.env.DATA_DIR?.trim() || "./data");
	mkdirSync(join(dataDir, "blobs"), { recursive: true });

	const database = undefined;
	const bucket = openFileBucket(join(dataDir, "blobs"));
	const mailer = openMailer(mailerConfig());
	const redisUrl = config.redis.url;
	const inboundQueue = openQueue("replyot-inbound", { redisUrl, concurrency: 10 });
	const outboundQueue = openQueue("replyot-outbound", { redisUrl, concurrency: 10 });
	const realtime = new RealtimeHubRegistry();
	const publicDir = resolve(process.env.PUBLIC_DIR?.trim() || "./public");

	const env = {
		DB: database,
		BUCKET: bucket,
		EMAIL: mailer,
		INBOUND_QUEUE: inboundQueue,
		OUTBOUND_QUEUE: outboundQueue,
		REDIS_URL: config.redis.url,
		RSPAMD_URL: config.rspamd.url,
		RSPAMD_ENABLED: config.rspamd.enabled ? "true" : "false",
		REALTIME: realtime.namespace(),
		ASSETS: openAssets(publicDir),
		IMAGES: undefined as unknown as CloudflareEnv["IMAGES"],
		WORKER_SELF_REFERENCE: undefined as unknown as CloudflareEnv["WORKER_SELF_REFERENCE"],
		LOGIN_RATE_LIMIT: openRateLimiter(20, 60),
		DEVICE_LOGIN_RATE_LIMIT: openRateLimiter(10, 60),
		B2_KEY_ID: config.storage.b2KeyId,
		B2_APPLICATION_KEY: config.storage.b2ApplicationKey,
		B2_BUCKET: config.storage.b2Bucket,
		B2_ENDPOINT: config.storage.b2Endpoint,
		S3_BUCKET: config.storage.s3Bucket,
		S3_BUCKET_NAME: config.storage.s3Bucket,
		S3_ENDPOINT: config.storage.s3Endpoint,
		S3_FORCE_PATH_STYLE: config.storage.s3ForcePathStyle ? "true" : "false",
		S3_REGION: config.storage.s3Region,
		S3_ACCESS_KEY_ID: config.storage.s3AccessKeyId,
		S3_SECRET_ACCESS_KEY: config.storage.s3SecretAccessKey,
		CF_TOKEN: process.env.CF_TOKEN?.trim(),
		CF_API_KEY: process.env.CF_API_KEY?.trim(),
		CF_EMAIL: process.env.CF_EMAIL?.trim(),
		AWS_ACCESS_KEY_ID: config.storage.s3AccessKeyId,
		AWS_SECRET_ACCESS_KEY: config.storage.s3SecretAccessKey,
		AWS_REGION: config.storage.s3Region,
		OUTBOUND_PROVIDER: config.email.outboundProvider,
		SYSTEM_FROM_EMAIL: config.email.systemFromEmail,
		STRIPE_SECRET_KEY: config.stripe.secretKey,
		STRIPE_WEBHOOK_SECRET: config.stripe.webhookSecret,
		STRIPE_PRICE_STARTER: config.stripe.priceStarter,
		STRIPE_PRICE_PRO: config.stripe.pricePro,
		STRIPE_PRICE_BUSINESS: config.stripe.priceBusiness,
		CAPTCHA_SECRET: config.auth.captchaSecret,
		GITHUB_UPDATE_TOKEN: config.deploy.githubUpdateToken,
		GITHUB_UPDATE_REF: config.deploy.githubUpdateRef,
		GITHUB_UPDATE_REPO: config.deploy.githubUpdateRepo,
		REPLYOT_RUNTIME: "node",
		APP_URL: config.urls.appUrl,
		INBOUND_WEBHOOK_SECRET: config.email.inboundWebhookSecret,
		VAPID_PUBLIC_KEY: config.push.vapidPublicKey,
		VAPID_PRIVATE_KEY: config.push.vapidPrivateKey,
		VAPID_SUBJECT: config.push.vapidSubject,
	} as unknown as CloudflareEnv;
	const storageEnv = withDatabase(withStorage(env));
	realtime.bindEnv(storageEnv);

	return {
		env: storageEnv,
		dataDir,
		database: undefined,
		mailer: mailer as unknown as Mailer,
		inboundQueue: inboundQueue as unknown as MailflareQueue,
		outboundQueue: outboundQueue as unknown as MailflareQueue,
		realtime,
	};
}
