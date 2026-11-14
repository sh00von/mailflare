// Automatically load .env file in Node runtime if present
if (typeof process.loadEnvFile === "function") {
	try {
		process.loadEnvFile();
	} catch {
		// Ignore if .env file is missing
	}
}

import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { getUserFromSession } from "@/lib/auth/session";
import { getSessionTokenFromRequest } from "@/lib/realtime/utils";
import { processInboundMessage } from "@/lib/email/inbound";
import { processOutboundQueue, type OutboundQueueMessage } from "@/lib/email/send";
import { processWebhookRetry, type WebhookRetryMessage } from "@/lib/email/webhooks";
import { processImportJob } from "@/lib/import/jobs";
import { applyPendingMigrations } from "@/lib/migrations/service";
import type { InboundQueueMessage } from "@/lib/email/inbound";
import type { ImportJobMessage } from "@/lib/import/jobs-types";
import { createNodeRuntime } from "./runtime/env";
import { autoSeedIfEmpty } from "./runtime/seed";

function isInboundQueueMessage(payload: unknown): payload is InboundQueueMessage {
	return typeof payload === "object" && payload !== null && "rawR2Key" in payload && "from" in payload && "to" in payload;
}

function isWebhookRetryMessage(payload: unknown): payload is WebhookRetryMessage {
	return typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "webhook.retry";
}

function isImportJobMessage(payload: unknown): payload is ImportJobMessage {
	return typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "import.run";
}
import { startScheduler } from "./runtime/scheduler";
import { startSmtpListener } from "./runtime/smtp";

/**
 * The self-hosted entrypoint: one Node process serving the Next app, the
 * realtime WebSocket, the SMTP listener, the job queues and the backup
 * schedule, the same jobs worker.ts spreads across Cloudflare products.
 */
async function main() {
	const port = Number(process.env.PORT ?? 4008);
	const host = process.env.HOST ?? "0.0.0.0";
	const dev = process.env.NODE_ENV !== "production";
	const runtime = createNodeRuntime();
	const { env } = runtime;
	globalThis.__replyotNodeEnv = env;

	if (!env.DB) {
		console.error("Replyot failed to start: No database configured. Set DATABASE_URL in your .env or environment.");
		process.exit(1);
	}

	let retries = 15;
	while (retries > 0) {
		try {
			const migrated = (await applyPendingMigrations(env.DB)).applied;
			if (migrated.length) console.log(`Applied ${migrated.length} migration(s): ${migrated.join(", ")}`);
			break;
		} catch (err: unknown) {
			retries--;
			const msg = err instanceof Error ? err.message : String(err);
			if (retries === 0) {
				console.error("Fatal error connecting to database or applying migrations:", msg);
				throw err;
			}
			console.log(`Waiting for database to be ready... (${msg}) Retrying in 2s... (${retries} attempts left)`);
			await new Promise((r) => setTimeout(r, 2000));
		}
	}

	await autoSeedIfEmpty(env.DB);

	runtime.inboundQueue.setConsumer(async (body) => {
		if (isInboundQueueMessage(body)) await processInboundMessage(env, body);
	});
	runtime.outboundQueue.setConsumer(async (body) => {
		if (isWebhookRetryMessage(body)) await processWebhookRetry(env, body as WebhookRetryMessage);
		else if (isImportJobMessage(body)) await processImportJob(env, body);
		else await processOutboundQueue(env, body as OutboundQueueMessage);
	});

	const app = next({ dev, dir: process.cwd(), hostname: host, port });
	const handle = app.getRequestHandler();
	await app.prepare();

	// Set TRUST_PROXY=1 when a reverse proxy terminates in front of this
	// process; the client IP it appended to x-forwarded-for is then trusted.
	// Direct exposure must leave it unset so only the socket IP is trusted.
	const trustProxy = ["1", "true", "yes"].includes((process.env.TRUST_PROXY ?? "").toLowerCase());

	const server = createServer((request, response) => {
		// The only client IP that cannot be forged is the socket's. Next sees
		// re-serialized headers, so stamp the resolved IP into a private header
		// after removing every client-supplied forwarding header — otherwise a
		// direct attacker could rotate them to dodge the login rate limiter.
		const forwarded = request.headers["x-forwarded-for"];
		const hops = (Array.isArray(forwarded) ? forwarded.at(-1) : forwarded)
			?.split(",")
			.map((hop) => hop.trim())
			.filter(Boolean) ?? [];
		const clientIp = (trustProxy ? hops.at(-1) : undefined) ?? request.socket.remoteAddress;
		delete request.headers["cf-connecting-ip"];
		delete request.headers["x-forwarded-for"];
		delete request.headers["x-replyot-client-ip"];
		if (clientIp) request.headers["x-replyot-client-ip"] = clientIp;
		const host = (request.headers["x-forwarded-host"] ?? request.headers.host ?? "").toString().toLowerCase();
		const parsed = parse(request.url ?? "/", true);
		const appBase = process.env.APP_URL?.trim().replace(/\/+$/, "");
		const appHost = appBase ? new URL(appBase).host.toLowerCase() : "";

		// 1. Customer Branded Webmail CNAME (e.g. mail.company.com)
		const isCustomerCname =
			appHost &&
			host !== appHost &&
			!host.endsWith(`.${appHost}`) &&
			(host.startsWith("mail.") || host.startsWith("webmail."));

		if (isCustomerCname && parsed.pathname === "/") {
			parsed.pathname = "/inbox";
			void handle(request, response, parsed);
			return;
		}

		const pathname = parsed.pathname ?? "/";

		// 2. Legacy Redirects (308 Permanent)
		const legacyRedirects: Record<string, string> = {
			"/dash": "/admin",
			"/dash/": "/admin",
			"/dash/domains": "/admin/domains",
			"/dash/accounts": "/admin/mailboxes",
			"/dash/plan": "/admin/plan",
			"/dash/workspaces": "/admin/workspaces",
			"/dash/spam-filter": "/admin/spam-filter",
			"/dash/backups": "/admin/backups",
			"/dash/audit-logs": "/admin/audit-logs",
			"/dash/activity": "/admin/activity",
			"/dash/general": "/admin/general",
			"/domains": "/admin/domains",
			"/accounts": "/admin/mailboxes",
			"/plan": "/admin/plan",
			"/workspaces": "/admin/workspaces",
			"/spam-filter": "/admin/spam-filter",
			"/backups": "/admin/backups",
			"/audit-logs": "/admin/audit-logs",
			"/activity": "/admin/activity",
			"/general": "/admin/general",
			"/inbox": "/mail/inbox",
			"/sent": "/mail/sent",
			"/drafts": "/mail/drafts",
			"/trash": "/mail/trash",
			"/spam": "/mail/spam",
			"/starred": "/mail/starred",
			"/archived": "/mail/archived",
			"/scheduled": "/mail/scheduled",
			"/snoozed": "/mail/snoozed",
			"/settings": "/mail/settings",
		};

		if (legacyRedirects[pathname]) {
			const target = `${legacyRedirects[pathname]}${parsed.search || ""}`;
			response.writeHead(308, { Location: target }).end();
			return;
		}

		if (pathname.startsWith("/dash/")) {
			const remainder = pathname.slice("/dash/".length);
			const target = remainder === "accounts" ? "mailboxes" : remainder;
			response.writeHead(308, { Location: `/admin/${target}${parsed.search || ""}` }).end();
			return;
		}
		if (pathname.startsWith("/accounts/")) {
			const remainder = pathname.slice("/accounts/".length);
			response.writeHead(308, { Location: `/admin/mailboxes/${remainder}${parsed.search || ""}` }).end();
			return;
		}
		if (pathname.startsWith("/folders/")) {
			const remainder = pathname.slice("/folders/".length);
			response.writeHead(308, { Location: `/mail/folders/${remainder}${parsed.search || ""}` }).end();
			return;
		}
		if (pathname.startsWith("/settings/")) {
			const remainder = pathname.slice("/settings/".length);
			response.writeHead(308, { Location: `/mail/settings/${remainder}${parsed.search || ""}` }).end();
			return;
		}

		// Next.js handles /admin/* and /mail/* rewrites natively via next.config.ts rewrites()
		void handle(request, response, parsed);
	});

	const wss = new WebSocketServer({ noServer: true });
	server.on("upgrade", (request, socket, head) => {
		const { pathname } = parse(request.url ?? "/");
		if (pathname !== "/api/realtime") {
			// Next's own dev-mode HMR socket, or anything else, is not ours.
			if (dev) app.getUpgradeHandler()(request, socket, head);
			else socket.destroy();
			return;
		}
		const cookie = request.headers.cookie ?? "";
		const token = getSessionTokenFromRequest(new Request("http://localhost/", { headers: { cookie } }));
		void getUserFromSession(env, token).then((user) => {
			if (!user || user.disabled) {
				socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
				socket.destroy();
				return;
			}
			wss.handleUpgrade(request, socket, head, (ws) => runtime.realtime.attach(user.id, ws));
		});
	});

	server.listen(port, host, () => {
		console.log(`Replyot listening on http://${host}:${port} (data in ${runtime.dataDir})`);
	});

	const defaultTls = (() => {
		const candidates = [
			{ key: "/data/key.pem", cert: "/data/cert.pem" },
			{ key: join(process.cwd(), "key.pem"), cert: join(process.cwd(), "cert.pem") },
		];
		for (const cand of candidates) {
			if (existsSync(cand.key) && existsSync(cand.cert)) {
				return { keyPath: cand.key, certPath: cand.cert };
			}
		}
		return null;
	})();

	const smtpTls = process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT
		? { keyPath: process.env.SMTP_TLS_KEY, certPath: process.env.SMTP_TLS_CERT }
		: defaultTls;

	const smtpPort = Number(process.env.SMTP_INBOUND_PORT ?? 25);
	if (smtpPort > 0) {
		startSmtpListener(env, runtime.mailer, {
			port: smtpPort,
			host: process.env.SMTP_INBOUND_HOST,
			maxSize: Number(process.env.SMTP_MAX_SIZE ?? 36 * 1024 * 1024),
			hostname: process.env.MAIL_HOSTNAME,
			tls: smtpTls,
		});
	}

	const stopScheduler = startScheduler(env);

	const shutdown = () => {
		stopScheduler();
		runtime.inboundQueue.stop();
		runtime.outboundQueue.stop();
		runtime.agentQueue.stop();
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(0), 5000).unref();
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch((error) => {
	console.error("Replyot failed to start", error);
	process.exit(1);
});
