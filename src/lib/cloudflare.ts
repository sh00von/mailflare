import { getNodeEnv } from "@/lib/runtime";
import { withDatabase } from "@/db/with-database";
import { withStorage } from "@/lib/storage";

export function getEnv(): CloudflareEnv {
	const env = getNodeEnv();
	if (!env) {
		throw new Error("Node runtime environment is not initialized (globalThis.__replyotNodeEnv is unset).");
	}
	return withDatabase(withStorage(env));
}

export async function getEnvAsync(): Promise<CloudflareEnv> {
	return getEnv();
}
