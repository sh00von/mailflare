/**
 * Centralized Application Configuration, Plans & Secrets Manager
 * Single source of truth for all environment variables, credentials, plan limits, and system parameters.
 * 
 * Rules:
 * - NO hardcoded secrets.
 * - NO scattered fallbacks.
 * - All secrets and environment variables are loaded here.
 * - Strongly typed and categorized by subsystem.
 */

function optional(name: string): string | undefined {
	const val = typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
	return val || undefined;
}

function parseBool(val?: string, defaultVal: boolean = false): boolean {
	if (!val) return defaultVal;
	const lower = val.toLowerCase().trim();
	return lower === "true" || lower === "1" || lower === "yes" || lower === "on";
}

function parseNum(val?: string, defaultVal: number = 0): number {
	if (!val) return defaultVal;
	const n = Number(val);
	return Number.isFinite(n) ? n : defaultVal;
}

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export const config = {
	isProduction: optional("NODE_ENV") === "production",
	isDevelopment: optional("NODE_ENV") === "development" || !optional("NODE_ENV"),

	server: {
		port: parseNum(optional("PORT"), 4008),
		host: optional("HOST") || "0.0.0.0",
		trustProxy: parseBool(optional("TRUST_PROXY"), false),
	},

	urls: {
		appUrl: optional("APP_URL")?.replace(/\/+$/, "") || "http://localhost:4008",
		adminAppUrl: (optional("ADMIN_APP_URL") || optional("NEXT_PUBLIC_ADMIN_APP_URL"))?.replace(/\/+$/, ""),
		mailAppUrl: (optional("MAIL_APP_URL") || optional("NEXT_PUBLIC_MAIL_APP_URL"))?.replace(/\/+$/, ""),
		cookieDomain: optional("COOKIE_DOMAIN"),
	},

	database: {
		url: optional("DATABASE_URL"),
		authToken: optional("DATABASE_AUTH_TOKEN"),
		driver: optional("DATABASE_DRIVER"),
		poolMax: parseNum(optional("DB_POOL_MAX"), 35),
	},

	redis: {
		url: optional("REDIS_URL"),
		enabled: !!optional("REDIS_URL"),
	},

	rspamd: {
		url: optional("RSPAMD_URL")?.replace(/\/+$/, "") || (optional("REDIS_URL") ? "http://rspamd:11333" : undefined),
		enabled: optional("RSPAMD_ENABLED") !== "false",
	},

	storage: {
		s3Endpoint: optional("S3_ENDPOINT"),
		s3AccessKeyId: optional("S3_ACCESS_KEY_ID") || optional("AWS_ACCESS_KEY_ID"),
		s3SecretAccessKey: optional("S3_SECRET_ACCESS_KEY") || optional("AWS_SECRET_ACCESS_KEY"),
		s3Bucket: optional("S3_BUCKET_NAME") || optional("S3_BUCKET"),
		s3Region: optional("S3_REGION") || optional("AWS_REGION") || "garage",
		s3ForcePathStyle: parseBool(optional("S3_FORCE_PATH_STYLE"), true),
		s3PublicUrl: optional("S3_PUBLIC_URL"),

		b2KeyId: optional("B2_KEY_ID"),
		b2ApplicationKey: optional("B2_APPLICATION_KEY"),
		b2Bucket: optional("B2_BUCKET"),
		b2Endpoint: optional("B2_ENDPOINT"),
	},

	email: {
		outboundProvider: optional("OUTBOUND_PROVIDER") || "postfix",
		smtpUrl: optional("SMTP_URL"),
		postfixHost: optional("POSTFIX_HOST"),
		postfixPort: parseNum(optional("POSTFIX_PORT"), 25),
		systemFromEmail: optional("SYSTEM_FROM_EMAIL"),
		mailHostname: optional("MAIL_HOSTNAME") || optional("NEXT_PUBLIC_MAIL_HOSTNAME"),
		serverIp: optional("SERVER_IP") || optional("NEXT_PUBLIC_SERVER_IP"),
		
		inboundPort: parseNum(optional("SMTP_INBOUND_PORT"), 25),
		inboundHost: optional("SMTP_INBOUND_HOST") || "0.0.0.0",
		maxSize: parseNum(optional("SMTP_MAX_SIZE"), 36 * 1024 * 1024), // 36 MB
		
		submissionPort: parseNum(optional("SMTP_SUBMISSION_PORT"), 587),
		submissionTlsPort: parseNum(optional("SMTP_SUBMISSION_TLS_PORT"), 465),
		submissionHost: optional("SMTP_SUBMISSION_HOST") || "0.0.0.0",
		
		tlsKeyPath: optional("SMTP_TLS_KEY"),
		tlsCertPath: optional("SMTP_TLS_CERT"),
		rejectUnauthorizedTls: optional("SMTP_TLS_REJECT_UNAUTHORIZED") !== "false",
		inboundWebhookSecret: optional("INBOUND_WEBHOOK_SECRET"),
	},

	stripe: {
		secretKey: optional("STRIPE_SECRET_KEY"),
		webhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
		priceStarter: optional("STRIPE_PRICE_STARTER"),
		pricePro: optional("STRIPE_PRICE_PRO"),
		priceBusiness: optional("STRIPE_PRICE_BUSINESS"),
		isConfigured: !!(optional("STRIPE_SECRET_KEY") && optional("STRIPE_WEBHOOK_SECRET")),
	},

	auth: {
		sessionSecret: optional("SESSION_SECRET"),
		captchaSecret: optional("CAPTCHA_SECRET"),
		captchaEnabled: parseBool(optional("ENABLE_CAPTCHA"), true),
		allowDemoSeed: parseBool(optional("ALLOW_DEMO_SEED"), false),
	},

	push: {
		vapidPublicKey: optional("VAPID_PUBLIC_KEY"),
		vapidPrivateKey: optional("VAPID_PRIVATE_KEY"),
		vapidSubject: optional("VAPID_SUBJECT"),
	},

	deploy: {
		dokployDeployWebhook: optional("DOKPLOY_DEPLOY_WEBHOOK"),
		githubUpdateToken: optional("GITHUB_UPDATE_TOKEN"),
		githubUpdateRef: optional("GITHUB_UPDATE_REF"),
		githubUpdateRepo: optional("GITHUB_UPDATE_REPO"),
	},

	/**
	 * Plan Limits, Tiers & Quota Configurations
	 * Can be overridden via PLAN_* environment variables in .env
	 */
	plans: {
		starter: {
			id: "starter" as const,
			name: "Starter",
			tagline: "Perfect for solo founders, freelancers & independent creators",
			maxDomains: parseNum(optional("PLAN_STARTER_MAX_DOMAINS"), 1),
			maxMailboxes: parseNum(optional("PLAN_STARTER_MAX_MAILBOXES"), 2),
			storageLimitBytes: parseNum(optional("PLAN_STARTER_STORAGE_BYTES"), 2 * GIB),
			storagePerMailboxBytes: parseNum(optional("PLAN_STARTER_STORAGE_PER_MB_BYTES"), 1 * GIB),
			storageLabel: "2 GB (1 GB / mailbox)",
			dailySendLimit: parseNum(optional("PLAN_STARTER_DAILY_SEND"), 250),
			hourlySendLimit: parseNum(optional("PLAN_STARTER_HOURLY_SEND"), 50),
			maxAttachmentMb: parseNum(optional("PLAN_STARTER_MAX_ATTACHMENT_MB"), 25),
			priceMonthlyUsd: 2.99,
			priceAnnualUsd: 29.0,
			features: [
				"1 Custom Domain",
				"Up to 2 Team Mailboxes",
				"2 GB Dedicated Storage (1 GB/mailbox)",
				"Unlimited Email Aliases",
				"Custom Email Signatures",
				"250 Emails / day",
			],
		},
		pro: {
			id: "pro" as const,
			name: "Pro Workspace",
			tagline: "High-performance email workspace for startups and growing teams",
			maxDomains: parseNum(optional("PLAN_PRO_MAX_DOMAINS"), 3),
			maxMailboxes: parseNum(optional("PLAN_PRO_MAX_MAILBOXES"), 5),
			storageLimitBytes: parseNum(optional("PLAN_PRO_STORAGE_BYTES"), 10 * GIB),
			storagePerMailboxBytes: parseNum(optional("PLAN_PRO_STORAGE_PER_MB_BYTES"), 2 * GIB),
			storageLabel: "10 GB (2 GB / mailbox)",
			dailySendLimit: parseNum(optional("PLAN_PRO_DAILY_SEND"), 1000),
			hourlySendLimit: parseNum(optional("PLAN_PRO_HOURLY_SEND"), 100),
			maxAttachmentMb: parseNum(optional("PLAN_PRO_MAX_ATTACHMENT_MB"), 25),
			priceMonthlyUsd: 6.99,
			priceAnnualUsd: 69.0,
			highlighted: true,
			features: [
				"Up to 3 Custom Domains",
				"Up to 5 Team Mailboxes",
				"10 GB Storage (2 GB / mailbox)",
				"Auto-forwarding & Blocklists",
				"Priority Inbound & Outbound Delivery",
				"1,000 Emails / day High Throughput",
				"24/7 Deliverability Health Monitoring",
			],
		},
		business: {
			id: "business" as const,
			name: "Business",
			tagline: "Expanded capacity and dedicated spam defense for organizations",
			maxDomains: parseNum(optional("PLAN_BUSINESS_MAX_DOMAINS"), 10),
			maxMailboxes: parseNum(optional("PLAN_BUSINESS_MAX_MAILBOXES"), 15),
			storageLimitBytes: parseNum(optional("PLAN_BUSINESS_STORAGE_BYTES"), 30 * GIB),
			storagePerMailboxBytes: parseNum(optional("PLAN_BUSINESS_STORAGE_PER_MB_BYTES"), 2 * GIB),
			storageLabel: "30 GB (2 GB / mailbox)",
			dailySendLimit: parseNum(optional("PLAN_BUSINESS_DAILY_SEND"), 5000),
			hourlySendLimit: parseNum(optional("PLAN_BUSINESS_HOURLY_SEND"), 300),
			maxAttachmentMb: parseNum(optional("PLAN_BUSINESS_MAX_ATTACHMENT_MB"), 50),
			priceMonthlyUsd: 9.99,
			priceAnnualUsd: 99.0,
			features: [
				"Up to 10 Custom Domains",
				"Up to 15 Team Mailboxes",
				"30 GB Storage (2 GB / mailbox)",
				"Dedicated Spam Reputation & Filters",
				"5,000 Emails / day Enterprise Sending",
				"Audit Logs & Compliance Backups",
				"Priority Engineering Support",
			],
		},
		free: {
			id: "free" as const,
			name: "Free Forever",
			tagline: "Essential custom domain webmail for personal use & developers",
			maxDomains: 1,
			maxMailboxes: 1,
			storageLimitBytes: 500 * MIB,
			storagePerMailboxBytes: 500 * MIB,
			storageLabel: "500 MB",
			dailySendLimit: 50,
			hourlySendLimit: 20,
			maxAttachmentMb: 15,
			priceMonthlyUsd: 0,
			priceAnnualUsd: 0,
			features: [
				"1 Custom Domain",
				"1 Mailbox (500 MB Storage)",
				"SPF, DKIM & DMARC Deliverability",
				"Modern Webmail & Mobile PWA",
				"50 Emails / day",
			],
		},
	},

	attachments: {
		maxMb: parseNum(optional("MAX_ATTACHMENT_MB"), 35),
		maxCount: parseNum(optional("MAX_ATTACHMENTS_PER_MESSAGE"), 10),
		memoryThresholdBytes: 2 * 1024 * 1024, // 2 MB RAM before disk spill
	},

	rateLimits: {
		loginAttempts: parseNum(optional("RATE_LIMIT_LOGIN_MAX"), 20),
		loginWindowSeconds: 60,
		deviceLoginAttempts: parseNum(optional("RATE_LIMIT_DEVICE_MAX"), 10),
		deviceLoginWindowSeconds: 60,
	},

	concurrency: {
		inboundQueueConcurrency: parseNum(optional("INBOUND_QUEUE_CONCURRENCY"), 10),
		outboundQueueConcurrency: parseNum(optional("OUTBOUND_QUEUE_CONCURRENCY"), 10),
		maxConnectionsPerIp: parseNum(optional("MAX_CONNECTIONS_PER_IP"), 10),
		maxSmtpClients: parseNum(optional("MAX_SMTP_CLIENTS"), 100),
	},
} as const;

export type AppConfig = typeof config;

/**
 * Get a required configuration secret or throw if missing.
 */
export function getRequiredSecret(keyPath: string, value: string | undefined): string {
	if (!value) {
		throw new Error(
			`[SECURITY ERROR] Required secret "${keyPath}" is not defined in environment variables. Define it in your .env file.`
		);
	}
	return value;
}
