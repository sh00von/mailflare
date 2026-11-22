import { readFileSync } from "node:fs";
import { SMTPServer, type SMTPServerAuthentication, type SMTPServerAuthenticationResponse, type SMTPServerSession } from "smtp-server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, messages, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { getEmailAddress } from "@/lib/email/address";
import { buildSnippet, parseRawMime } from "@/lib/email/parse";
import { checkRecipientsSuppressed } from "@/lib/email/suppression";
import { checkDailyOutboundQuota, incrementDailyOutboundQuota } from "@/lib/email/quota-limiter";
import { spoolIncomingStream } from "./spooler";
import { config } from "@/lib/config";
import { newId } from "@/lib/ids";
import type { Mailer } from "./mailer";

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

	const server = new SMTPServer({
		secure: options.secure ?? false,
		name: options.hostname || "mailflare.local",
		banner: "Mailflare Submission Service Ready",
		authMethods: ["PLAIN", "LOGIN"],
		disabledCommands: options.tls ? [] : ["STARTTLS"],
		key,
		cert,
		size: config.email.maxSize,

		async onAuth(
			auth: SMTPServerAuthentication,
			session: SMTPServerSession,
			callback: (err: Error | null, response?: SMTPServerAuthenticationResponse) => void,
		) {
			const username = (auth.username || "").trim().toLowerCase();
			const password = auth.password || "";

			if (!username || !password) {
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

				if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) {
					console.warn(`SMTP Submission auth failed for username: ${username}`);
					return callback(new Error("535 5.7.8 Authentication credentials invalid"));
				}

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
			if (authUser) {
				try {
					const quota = await checkDailyOutboundQuota(db, env, { userId: authUser.userId }, 1);
					if (!quota.allowed) {
						return callback(new Error(`452 4.5.3 ${quota.reason || "Daily sending quota exceeded"}`));
					}
				} catch (err) {
					console.warn("Quota check error in onMailFrom:", err);
				}
			}
			return callback();
		},

		async onRcptTo(address, session, callback) {
			if (!session.user) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}

			const recipient = getEmailAddress(address.address) || address.address.trim().toLowerCase();
			try {
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
			if (!authUser) {
				return callback(new Error("530 5.7.0 Authentication required"));
			}

			spoolIncomingStream(stream)
				.then(async (spooled) => {
					try {
						const rawBuffer = spooled.buffer;
						const parsed = await parseRawMime(toArrayBuffer(rawBuffer));
						const envelopeFrom =
							(session.envelope?.mailFrom && typeof session.envelope.mailFrom === "object"
								? session.envelope.mailFrom.address
								: undefined) || authUser.email;
						const envelopeRecipients = (session.envelope?.rcptTo || []).map((r) => r.address);

						if (envelopeRecipients.length === 0) {
							return callback(new Error("503 5.5.1 No recipients specified"));
						}

						// Forward through Mailer to Postfix outbound MTA for each recipient
						for (const recipient of envelopeRecipients) {
							await mailer.sendRaw(envelopeFrom, recipient, rawBuffer);
						}

						// Store sent message record in Sent folder
						try {
							const resolvedMailboxId =
								authUser.mailboxId ||
								(await db
									.select({ id: mailboxes.id })
									.from(mailboxes)
									.where(eq(mailboxes.userId, authUser.userId))
									.limit(1)
									.then((rows) => rows[0]?.id));

							const snippet = buildSnippet(parsed.text, parsed.html);
							await db.insert(messages).values({
								id: newId(),
								userId: authUser.userId,
								mailboxId: resolvedMailboxId ?? null,
								direction: "outbound",
								fromAddr: envelopeFrom,
								toAddr: envelopeRecipients.join(", "),
								subject: parsed.subject || "(No Subject)",
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
