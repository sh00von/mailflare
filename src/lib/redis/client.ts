import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function getSharedRedis(redisUrl?: string): Redis | null {
	const url = redisUrl || process.env.REDIS_URL;
	if (!url) return null;

	if (!redisInstance) {
		try {
			redisInstance = new Redis(url, {
				maxRetriesPerRequest: 1,
				enableReadyCheck: false,
				lazyConnect: true,
			});
			redisInstance.connect().catch((err) => {
				console.warn("Shared Redis connection failed (running in fallback mode):", err?.message || err);
			});
			redisInstance.on("error", (err) => {
				console.warn("Shared Redis warning:", err?.message || err);
			});
		} catch (err) {
			console.warn("Failed to initialize Redis client:", err);
			return null;
		}
	}

	return redisInstance;
}
