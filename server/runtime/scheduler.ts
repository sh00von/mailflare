import { runScheduledDatabaseBackup } from "@/lib/backups/runner";
import { runTrashRetention } from "@/lib/email/trash-retention";
import { runAccountRetention } from "@/lib/accounts/deletion";
import { runFollowUpReminders } from "@/lib/follow-ups/service";
import { sweepImportJobs } from "@/lib/import/jobs";
import { sweepOrphanedRawMail } from "@/lib/email/raw-sweeper";
import { pruneExpiredSuppression } from "@/lib/email/suppression";
import { pollDnsHealthForActiveDomains } from "@/lib/domains/dns-inspector";
import { getDb } from "@/db";

/** Fire the daily 02:00 UTC backup and the recurring maintenance jobs, matching the cron triggers in wrangler.jsonc. */
export function startScheduler(env: CloudflareEnv) {
	let lastRunDay = "";
	let lastDnsPollHour = -1;
	const timer = setInterval(() => {
		runTrashRetention(env).catch((error) => console.error("Trash retention failed", error));
		sweepImportJobs(env).catch((error) => console.error("Import job sweep failed", error));
		const now = new Date();
		runFollowUpReminders(env, now).catch((error) => console.error("Follow-up reminders failed", error));

		// 4-Hour DNS Health Poll
		if (now.getUTCHours() % 4 === 0 && now.getUTCHours() !== lastDnsPollHour) {
			lastDnsPollHour = now.getUTCHours();
			pollDnsHealthForActiveDomains(env).catch((error) => console.error("DNS health poll failed", error));
		}
		const day = now.toISOString().slice(0, 10);
		if (now.getUTCHours() !== 2 || lastRunDay === day) return;
		lastRunDay = day;
		runScheduledDatabaseBackup(env, now).catch((error) => console.error("Scheduled backup failed", error));
		runAccountRetention(env, now).catch((error) => console.error("Account retention failed", error));
		sweepOrphanedRawMail(env, now).catch((error) => console.error("Raw mail sweep failed", error));
		pruneExpiredSuppression(getDb(env)).catch((error) => console.error("Suppression prune failed", error));
	}, 60_000);
	return () => clearInterval(timer);
}
