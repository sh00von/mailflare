import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function splitSqlStatements(sql: string): string[] {
	const statements: string[] = [];
	let current = "";
	let inQuote = false;
	let inLineComment = false;

	for (let i = 0; i < sql.length; i++) {
		const char = sql[i];
		const next = sql[i + 1];

		if (inLineComment) {
			if (char === "\n") {
				inLineComment = false;
			}
			continue;
		}

		if (!inQuote && char === "-" && next === "-") {
			inLineComment = true;
			i++;
			continue;
		}

		if (char === "'") {
			if (inQuote && next === "'") {
				current += "''";
				i++;
				continue;
			}
			inQuote = !inQuote;
		}

		if (char === ";" && !inQuote) {
			const trimmed = current.trim();
			if (trimmed) {
				statements.push(trimmed);
			}
			current = "";
		} else {
			current += char;
		}
	}

	const trimmed = current.trim();
	if (trimmed) {
		statements.push(trimmed);
	}
	return statements;
}

export async function autoSeedIfEmpty(db: D1Database): Promise<void> {
	try {
		const countRow = await db.prepare('SELECT count(*) as c FROM "users"').first<{ c: number | string }>();
		const count = Number(countRow?.c ?? 0);
		if (count > 0) {
			return;
		}

		console.log("[Seed] No users found in database. Checking for initial seed dump...");
		const candidatePaths = [
			join(process.cwd(), "scripts", "neon-dump.sql"),
			join(process.cwd(), "neon-dump.sql"),
			"/app/scripts/neon-dump.sql",
		];

		let dumpPath: string | null = null;
		for (const p of candidatePaths) {
			if (existsSync(p)) {
				dumpPath = p;
				break;
			}
		}

		if (!dumpPath) {
			console.log("[Seed] No seed file found, skipping initial auto-seed.");
			return;
		}

		console.log(`[Seed] Loading seed data from ${dumpPath}...`);
		const sqlContent = readFileSync(dumpPath, "utf-8");
		const statements = splitSqlStatements(sqlContent);

		console.log(`[Seed] Executing ${statements.length} seed statements...`);
		let executed = 0;
		for (const stmt of statements) {
			try {
				await db.prepare(stmt).run();
				executed++;
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				console.warn(`[Seed] Warning executing statement: ${msg}`);
			}
		}
		console.log(`[Seed] Successfully restored ${executed}/${statements.length} seed records into database.`);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[Seed] Auto-seed error:", msg);
	}
}
