declare global {
	interface D1Database {
		prepare(query: string): any;
		batch(statements: any[]): Promise<any[]>;
		exec(query: string): Promise<any>;
		dump?(): Promise<ArrayBuffer>;
	}
	interface R2Bucket {
		get(key: string, options?: any): Promise<any>;
		put(key: string, value: any, options?: any): Promise<any>;
		delete(key: string | string[]): Promise<any>;
		list(options?: any): Promise<any>;
		head?(key: string): Promise<any>;
	}
	interface ForwardableEmailMessage {
		from: string;
		to: string;
		raw: ReadableStream;
		setReject(reason: string): void;
		forward(rcptTo: string, headers?: Headers): Promise<void>;
		reply(message: any): Promise<void>;
	}
	interface SendEmail {
		send(message: any): Promise<void>;
	}
	interface Queue<T = any> {
		send(message: T): Promise<void>;
		sendBatch(messages: { body: T }[]): Promise<void>;
	}
	interface Fetcher {
		fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
	}
	interface ImagesBinding {
		info?(stream: ReadableStream): Promise<any>;
		transform?(stream: ReadableStream, options: any): Promise<any>;
	}
	interface DurableObjectNamespace<T = any> {
		idFromName(name: string): any;
		get(id: any): any;
	}
	interface RateLimit {
		limit(options: { key: string }): Promise<{ success: boolean }>;
	}
	interface Ai {
		run(model: string, inputs: any): Promise<any>;
	}
	interface WebSocketPair {
		0: any;
		1: any;
	}
	var WebSocketPair: {
		new (): WebSocketPair;
	};
}

interface CloudflareEnv {
	DB: D1Database;
	/** Connection string for an external database (PostgreSQL, MySQL, libSQL, ...); unset keeps D1. See docs/databases.md. */
	DATABASE_URL?: string;
	/** Driver override when it cannot be inferred from DATABASE_URL (neon, postgres-js, pglite, planetscale, ...). */
	DATABASE_DRIVER?: string;
	/** Auth token for libSQL / Turso. */
	DATABASE_AUTH_TOKEN?: string;
	/** Hyperdrive binding, used as the connection string when DATABASE_URL is unset. */
	HYPERDRIVE?: { connectionString: string };
	EMAIL: SendEmail;
	BUCKET: R2Bucket;
	INBOUND_QUEUE: Queue<import("./src/lib/email/inbound").InboundQueueMessage>;
	// The outbound queue also carries webhook retries and import job chunks so that scheduled redelivery needs no extra binding.
	OUTBOUND_QUEUE: Queue<
		| import("./src/lib/email/send").OutboundQueueMessage
		| import("./src/lib/email/webhooks").WebhookRetryMessage
		| import("./src/lib/import/jobs-types").ImportJobMessage
	>;
	ASSETS: Fetcher;
	IMAGES: ImagesBinding;
	WORKER_SELF_REFERENCE: Fetcher;
	REALTIME: DurableObjectNamespace<
		import("./src/lib/realtime/hub").RealtimeHub
	>;
	LOGIN_RATE_LIMIT?: RateLimit;
	/** Mobile device sign-in (`/api/auth/device`), stricter than the web login. */
	DEVICE_LOGIN_RATE_LIMIT?: RateLimit;
	/** APNs auth key for the mobile push relay (src/lib/push/native.ts). */
	APNS_KEY_ID?: string;
	APNS_TEAM_ID?: string;
	/** The .p8 file contents (PKCS#8 PEM). */
	APNS_PRIVATE_KEY?: string;
	/** Origin of a Mailflare push relay (mailflare-relay); lets this server push without APNS_* keys. */
	APNS_RELAY_URL?: string;
	/** Redis connection string for persistent BullMQ queue. */
	REDIS_URL?: string;
	/** Rspamd HTTP API endpoint (e.g. http://rspamd:11333). */
	RSPAMD_URL?: string;
	/** Whether Rspamd inspection is enabled ("false" to disable). */
	RSPAMD_ENABLED?: string;
	/** Spamhaus Data Query Service key; enables ZEN (sending IP) and DBL (domain) checks in spam analysis. */
	SPAMHAUS_DQS_KEY?: string;
	/** abuse.ch Auth-Key; enables URLhaus malware-host checks for links in incoming mail. */
	ABUSECH_AUTH_KEY?: string;
	/** "off" disables the RDAP domain-age check in spam analysis. */
	SPAM_DOMAIN_AGE_CHECK?: string;
	/**
	 * Backblaze B2 storage. When all four are set, B2 replaces the R2 binding for raw mail, attachments, Drive,
	 * avatars, branding and backups. B2_ENDPOINT is the S3-compatible host, e.g. s3.us-west-004.backblazeb2.com.
	 */
	B2_KEY_ID?: string;
	B2_APPLICATION_KEY?: string;
	B2_BUCKET?: string;
	B2_ENDPOINT?: string;
	/**
	 * AWS S3 storage, used when B2 is not configured. Credentials fall back to AWS_ACCESS_KEY_ID /
	 * AWS_SECRET_ACCESS_KEY (read from the environment), so an existing SES key can serve both.
	 */
	S3_BUCKET?: string;
	S3_REGION?: string;
	S3_ACCESS_KEY_ID?: string;
	S3_SECRET_ACCESS_KEY?: string;
	CF_TOKEN?: string;
	CF_API_KEY?: string;
	CF_EMAIL?: string;
	CAPTCHA_SECRET?: string;
	GITHUB_UPDATE_TOKEN?: string;
	GITHUB_UPDATE_REF?: string;
	GITHUB_UPDATE_REPO?: string;
	/** "node" when served by the self-hosted runtime in server/; unset on Workers. */
	MAILFLARE_RUNTIME?: "node";
	REPLYOT_RUNTIME?: "node";
	/** Shared secret the Cloudflare email relay signs inbound webhooks with (self-hosted only). */
	INBOUND_WEBHOOK_SECRET?: string;
	/** "1" refuses relays that do not sign the header map with a timestamp (relay Worker v2). */
	INBOUND_REQUIRE_SIGNED_HEADERS?: string;
	/** Cloudflare account id, needed for the Email Sending REST API off Workers. */
	CF_ACCOUNT_ID?: string;
	/** Public origin of this install (https://mail.example.com) when it sits behind a proxy. */
	APP_URL?: string;
	/** VAPID public key (uncompressed P-256 point, URL-safe base64) for Web Push. */
	VAPID_PUBLIC_KEY?: string;
	/** VAPID private scalar (URL-safe base64). Keep this secret. */
	VAPID_PRIVATE_KEY?: string;
	/** Contact URI for VAPID, e.g. mailto:admin@example.com or https://mail.example.com. */
	VAPID_SUBJECT?: string;
}
