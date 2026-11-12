import { getDatabaseConfig } from "@/db/with-database";
import { isNodeRuntime } from "@/lib/runtime";
import type { SetupRequirementCheck } from "./types";

export function getSetupRequirementChecks(env: CloudflareEnv): SetupRequirementCheck[] {
	const database = getDatabaseConfig(env);
	if (isNodeRuntime(env)) {
		const mailer = env.EMAIL as unknown as { configured?: boolean };
		const hasResend = !!process.env.RESEND_API_KEY?.trim();
		const hasSes = !!process.env.AWS_ACCESS_KEY_ID?.trim() && !!process.env.AWS_SECRET_ACCESS_KEY?.trim();
		const outboundReady = mailer?.configured === true || hasResend || hasSes;
		return [
			{
				key: "Database",
				configured: !!env.DB,
				message: database.driver === "d1" ? "DATA_DIR must be writable; the SQLite database is created there on start." : "DATABASE_URL must be reachable; migrations are applied on start.",
			},
			{
				key: "Outbound mail (optional)",
				configured: true,
				message: outboundReady
					? "Outbound mail relay is configured."
					: "Not set: you can complete setup now and configure Resend, Amazon SES, or SMTP_URL later.",
			},
		];
	}

	return [
		{
			key: "Database",
			configured: !!env.DB,
			message: "Database binding is ready.",
		},
	];
}
