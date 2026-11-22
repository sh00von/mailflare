import { readFileSync } from "node:fs";
import { SMTPServer, type SMTPServerAuthentication, type SMTPServerAuthenticationResponse, type SMTPServerSession } from "smtp-server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, messages, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { authenticateApiKeyValue, hasScope } from "@/lib/api/key-auth";
import { getEmailAddress } from "@/lib/email/address";
import { getMailboxDomainAddresses } from "@/lib/mailboxes/domain-addresses";
import { buildSnippet, parseRawMime } from "@/lib/email/parse";
import { checkRecipientsSuppressed } from "@/lib/email/suppression";
import { checkDailyOutboundQuota, incrementDailyOutboundQuota } from "@/lib/email/quota-limiter";
import { spoolIncomingStream } from "./spooler";
import { config } from "@/lib/config";
import { newId } from "@/lib/ids";
import type { Mailer } from "./mailer";

const MAX_CLIENTS = 100;
const MAX_CONNECTIONS_PER_IP = 10;
const MAX_RECIPIENTS = 50;
const SOCKET_TIMEOUT_MS = 60_000;
const AUTH_FAILURE_WINDOW_MS = 60_000;
const MAX_AUTH_FAILURES_PER_IP = 15;

interface SmtpSubmissionOptions {
	port: number;
	host?: string;
	secure?: boolean;
	hostname?: string;
	tls: { keyPath: string; certPath: string } | null;
}

interface AuthenticatedSessionUser {
	userId: string;
	email: string;
	mailboxId?: string;
	authorizedFrom?: { address: string; mailboxId: string };
}

/**
 * Authenticated SMTP Submission Server for standard mail clients (Apple Mail, Outlook, Thunderbird, mobile apps).
 * Listens on Port 587 (STARTTLS) and Port 465 (implicit TLS).
 */
export function startSmtpSubmissionListener(
	env: CloudflareEnv,
	mailer: Mailer,
	options: SmtpSubmissionOptions,
) {
	const db = getDb(env);
	const key = options.tls ? readFileSync(options.tls.keyPath) : undefined;
	const cert = options.tls ? readFileSync(options.tls.certPath) : undefined;

	const sessionUsers = new Map<string, AuthenticatedSessionUser>();
	const connectionsByIp = new Map<string, number>();
	const admittedSessions = new Set<string>();
	const authFailuresByIp = new Map<string, { start: number; count: number }>();

	function isAuthRateLimited(ip: string): boolean {
		const entry = authFailuresByIp.get(ip);
		if (!entry) return false;
		if (Date.now() - entry.start >= AUTH_FAILURE_WINDOW_MS) {
			authFailuresByIp.delete(ip);
			return false;
		}
		return entry.count >= MAX_AUTH_FAILURES_PER_IP;
	}

	function recordAuthFailure(ip: string): void {
		const now = Date.now();
		if (authFailuresByIp.size > 2000) authFailuresByIp.clear();
		const entry = authFailuresByIp.get(ip);
		if (!entry || now - entry.start >= AUTH_FAILURE_WINDOW_MS) {
			authFailuresByIp.set(ip, { start: now, count: 1 });
		} else {
			entry.count += 1;
		}
	}

	async function resolveAuthorizedSender(userId: string, candidateAddress: string): Promise<{ address: string; mailboxId: string } | null> {
		const normalized = (getEmailAddress(candidateAddress) || candidateAddress).trim().toLowerCase();
		if (!normalized) return null;

		const userMailboxes = await db
			.select({
				id: mailboxes.id,
				domainId: mailboxes.domainId,
				localPart: mailboxes.localPart,
				useAllDomains: mailboxes.useAllDomains,
				hostname: domains.hostname,
				domainStatus: domains.status,
				sendingEnabled: domains.sendingEnabled,
			})
			.from(mailboxes)
			.innerJoin(domains, eq(mailboxes.domainId, domains.id))
			.where(and(eq(mailboxes.userId, userId), eq(mailboxes.disabled, false)));

		for (const mb of userMailboxes) {
			if (mb.domainStatus !== "active" || mb.sendingEnabled === false) continue;
			const permitted = await getMailboxDomainAddresses(db, mb);
			if (permitted.includes(normalized)) {
				return { address: normalized, mailboxId: mb.id };
			}
		}
		return null;
	}

	const server = new SMTPServer({
		secure: options.secure ?? false,
		maxClients: MAX_CLIENTS,
		socketTimeout: SOCKET_TIMEOUT_MS,
		name: options.hostname || "mailflare.local",
		banner: "Mailflare Submission Service Ready",
		authMethods: ["PLAIN", "LOGIN"],
		disabledCommands: options.tls ? [] : ["STARTTLS"],
		key,
		cert,
		size: config.email.maxSize,

		onConnect(session, callback) {
			const ip = session.remoteAddress;
			const count = (connectionsByIp.get(ip) ?? 0) + 1;
			if (count > MAX_CONNECTIONS_PER_IP || admittedSessions.size >= MAX_CLIENTS) {
				callback(Object.assign(new Error("Too many connections"), { responseCode: 421 }));
				return;
			}
			admittedSessions.add(session.id);
			connectionsByIp.set(ip, count);
			callback();
		},

		async onAuth(
			auth: SMTPServerAuthentication,
			session: SMTPServerSession,
			callback: (err: Error | null, response?: SMTPServerAuthenticationResponse) => void,
		) {
			const ip = session.remoteAddress || "unknown";
			if (isAuthRateLimited(ip)) {
				return callback(Object.assign(new Error("421 4.7.0 Too many failed authentication attempts"), { responseCode: 421 }));
			}

			const username = (auth.username || "").trim().toLowerCase();
			const password = auth.password || "";

			if (!username || !password) {
				recordAuthFailure(ip);
				return callback(new Error("535 5.7.8 Authentication credentials missing"));
			}

			try {
				let [user] = await db
					.select()
					.from(users)
					.where(eq(users.email, username))
					.limit(1);

				let matchedMailboxId: string | undefined;

				if (!user && username.includes("@")) {
					const [localPart, host] = username.split("@");
					const [mb] = await db
						.select({
							mailboxId: mailboxes.id,
							userId: mailboxes.userId,
						})
						.from(mailboxes)
						.innerJoin(domains, eq(mailboxes.domainId, domains.id))
						.where(and(eq(mailboxes.localPart, localPart), eq(domains.hostname, host)))
						.limit(1);

					if (mb) {
						matchedMailboxId = mb.mailboxId;
						[user] = await db.select().from(users).where(eq(users.id, mb.userId)).limit(1);
					}
				}

				if (!user || user.disabled || user.deletedAt) {
					recordAuthFailure(ip);
					console.warn(`SMTP Submission auth failed for username: ${username}`);
					return callback(new Error("535 5.7.8 Authentication credentials invalid"));
				}

				// Allow scoped API keys ("send") for SMTP clients (required when 2FA is enabled).
				let authenticated = false;
				const apiAuth = await authenticateApiKeyValue(env, password);
				if (apiAuth && apiAuth.userId === user.id && hasScope(apiAuth.scopes, "send")) {
					authenticated = true;
				} else if (!user.requireSecondFactor && verifyPassword(password, user.passwordHash)) {
					authenticated = true;
				}

				if (!authenticated) {
					recordAuthFailure(ip);
					console.warn(`SMTP Submission auth failed for username: ${username}`);
					return callback(
						new Error(
							user.requireSecondFactor
								? "535 5.7.8 Two-factor authentication is enabled; use an API key with send scope"
								: "535 5.7.8 Authentication credentials invalid",
						),
					);
				}

				authFailuresByIp.delete(ip);
				sessionUsers.set(session.id, {
					userId: user.id,
					email: user.email,
					mailboxId: matchedMailboxId,
				});

				return callback(null, { user: user.id });
			} catch (error) {
				console.error("SMTP Submission onAuth error:", error);
				return callback(new Error("454 4.7.0 Temporary authentication failure"));
			}
		},

		async onMailFrom(address, session, callback) {
			if (!session.user) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}
			const authUser = sessionUsers.get(session.id);
			if (!authUser) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}

			try {
				const authorized = await resolveAuthorizedSender(authUser.userId, address.address);
				if (!authorized) {
					return callback(new Error("553 5.7.1 Sender address rejected: not owned by authenticated user or domain inactive"));
				}
				authUser.authorizedFrom = authorized;

				const quota = await checkDailyOutboundQuota(db, env, { userId: authUser.userId }, 1);
				if (!quota.allowed) {
					return callback(new Error(`452 4.5.3 ${quota.reason || "Daily sending quota exceeded"}`));
				}
			} catch (err) {
				console.warn("Sender/quota check error in onMailFrom:", err);
				return callback(new Error("451 4.3.0 Temporary validation error"));
			}
			return callback();
		},

		async onRcptTo(address, session, callback) {
			if (!session.user) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}
			const authUser = sessionUsers.get(session.id);
			if (!authUser) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}
			if (session.envelope.rcptTo.length >= MAX_RECIPIENTS) {
				return callback(Object.assign(new Error("452 4.5.3 Too many recipients"), { responseCode: 452 }));
			}

			const recipient = getEmailAddress(address.address) || address.address.trim().toLowerCase();
			try {
				const quota = await checkDailyOutboundQuota(db, env, { userId: authUser.userId }, session.envelope.rcptTo.length + 1);
				if (!quota.allowed) {
					return callback(new Error(`452 4.5.3 ${quota.reason || "Daily sending quota exceeded"}`));
				}
				const [suppressed] = await checkRecipientsSuppressed(db, [recipient]);
				if (suppressed) {
					console.warn(`SMTP Submission rejected send to suppressed address: ${recipient}`);
					return callback(
						new Error(`550 5.1.1 <${recipient}> Recipient address is suppressed due to previous delivery failures`),
					);
				}
				return callback();
			} catch (error) {
				console.error("Error in onRcptTo suppression check:", error);
				return callback();
			}
		},

		onData(stream, session, callback) {
			const authUser = sessionUsers.get(session.id);
			const authorizedFrom = authUser?.authorizedFrom;
			if (!authUser || !authorizedFrom) {
				return callback(new Error("530 5.7.0 Authentication and authorized sender required"));
			}
			if (stream.sizeExceeded) {
				return callback(Object.assign(new Error("552 5.3.4 Message exceeds size limit"), { responseCode: 552 }));
			}

			spoolIncomingStream(stream)
				.then(async (spooled) => {
					try {
						if (stream.sizeExceeded || spooled.size > config.email.maxSize) {
							return callback(Object.assign(new Error("552 5.3.4 Message exceeds size limit"), { responseCode: 552 }));
						}

						const rawBuffer = spooled.buffer;
						const parsed = await parseRawMime(toArrayBuffer(rawBuffer));
						const envelopeFrom = authorizedFrom.address;
						const envelopeRecipients = (session.envelope?.rcptTo || []).map((r) => r.address);

						if (envelopeRecipients.length === 0) {
							return callback(new Error("503 5.5.1 No recipients specified"));
						}
						if (envelopeRecipients.length > MAX_RECIPIENTS) {
							return callback(Object.assign(new Error("452 4.5.3 Too many recipients"), { responseCode: 452 }));
						}

						// Prevent MIME From header spoofing: if a From header is present, it must also belong to the user.
						if (parsed.fromAddr) {
							const headerAuthorized = await resolveAuthorizedSender(authUser.userId, parsed.fromAddr);
							if (!headerAuthorized) {
								return callback(new Error("553 5.7.1 Header From address rejected: not owned by authenticated user"));
							}
						}

						const quota = await checkDailyOutboundQuota(db, env, { userId: authUser.userId }, envelopeRecipients.length);
						if (!quota.allowed) {
							return callback(new Error(`452 4.5.3 ${quota.reason || "Daily sending quota exceeded"}`));
						}

						// Forward through Mailer to Postfix outbound MTA for each recipient
						for (const recipient of envelopeRecipients) {
							await mailer.sendRaw(envelopeFrom, recipient, rawBuffer);
						}

						// Store sent message record in Sent folder
						try {
							const resolvedMailboxId = authorizedFrom.mailboxId || authUser.mailboxId || null;

							const snippet = buildSnippet(parsed.text, parsed.html);
							await db.insert(messages).values({
								id: newId(),
								userId: authUser.userId,
								mailboxId: resolvedMailboxId,
								direction: "outbound",
								fromAddr: envelopeFrom,
								toAddr: envelopeRecipients.join(", "),
								subject: (parsed.subject || "(No Subject)").replace(/[\r\n\0]/g, " ").trim(),
								snippet,
								textBody: parsed.text || "",
								htmlBody: parsed.html || null,
								status: "sent",
								read: true,
								createdAt: new Date(),
							});
						} catch (saveError) {
							console.warn("Failed to record SMTP sent message in DB:", saveError);
						}

						await incrementDailyOutboundQuota(
							db,
							env,
							{ userId: authUser.userId },
							envelopeRecipients.length,
						).catch(() => null);

						return callback(null, "250 2.0.0 OK: message queued for delivery");
					} catch (sendError) {
						console.error("SMTP Submission dispatch error:", sendError);
						return callback(new Error("451 4.3.0 Delivery failed, please try again later"));
					} finally {
						await spooled.cleanup();
					}
				})
				.catch((err) => {
					console.error("SMTP Submission stream spooling error:", err);
					callback(new Error("451 4.3.0 Transmission failed"));
				});
		},

		onClose(session) {
			sessionUsers.delete(session.id);
			if (!admittedSessions.delete(session.id)) return;
			const ip = session.remoteAddress;
			const count = (connectionsByIp.get(ip) ?? 1) - 1;
			if (count <= 0) connectionsByIp.delete(ip);
			else connectionsByIp.set(ip, count);
		},
	});

	server.listen(options.port, options.host || "0.0.0.0", () => {
		console.log(
			`SMTP Submission listening on port ${options.port} (${options.secure ? "implicit TLS" : "STARTTLS"})`,
		);
	});

	return server;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
