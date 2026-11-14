/**
 * Caps wrong second-factor codes. The per-IP login limiter alone lets an attacker who already has the password
 * guess six-digit codes from many addresses, so failures are also counted per login challenge (burned after
 * MAX_FAILURES_PER_CHALLENGE) and per account (MAX_FAILURES_PER_USER within WINDOW_MS).
 *
 * State is in memory: the self-hosted server is a single process. Run several replicas and each keeps its own
 * count, which still bounds guesses to replicas × limit.
 */
export const MAX_FAILURES_PER_CHALLENGE = 5;
export const MAX_FAILURES_PER_USER = 10;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 10_000;

type Counter = { count: number; resetAt: number };

const byChallenge = new Map<string, Counter>();
const byUser = new Map<string, Counter>();

function read(map: Map<string, Counter>, key: string, now: number): number {
	const entry = map.get(key);
	if (!entry) return 0;
	if (entry.resetAt <= now) {
		map.delete(key);
		return 0;
	}
	return entry.count;
}

function bump(map: Map<string, Counter>, key: string, now: number): number {
	if (map.size >= MAX_ENTRIES) {
		for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
		if (map.size >= MAX_ENTRIES) map.delete(map.keys().next().value!);
	}
	const count = read(map, key, now) + 1;
	map.set(key, { count, resetAt: map.get(key)?.resetAt ?? now + WINDOW_MS });
	return count;
}

/** Whether another code may be tried for this account and challenge. */
export function canAttemptSecondFactor(userId: string, challengeKey: string, now = Date.now()): boolean {
	return read(byUser, userId, now) < MAX_FAILURES_PER_USER && read(byChallenge, challengeKey, now) < MAX_FAILURES_PER_CHALLENGE;
}

/** Records a wrong code; returns true when the challenge is now exhausted and should be discarded. */
export function recordSecondFactorFailure(userId: string, challengeKey: string, now = Date.now()): boolean {
	bump(byUser, userId, now);
	return bump(byChallenge, challengeKey, now) >= MAX_FAILURES_PER_CHALLENGE;
}

/** A correct code clears the account's failure count. */
export function clearSecondFactorFailures(userId: string, challengeKey: string): void {
	byUser.delete(userId);
	byChallenge.delete(challengeKey);
}

/** Test hook. */
export function resetSecondFactorAttempts(): void {
	byChallenge.clear();
	byUser.clear();
}
