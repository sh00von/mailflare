import type { SpamIntelligenceInput, SpamIntelligenceProvider, SpamSignal } from "../types";
import { config } from "@/lib/config";

export interface RspamdCheckOptions {
	rspamdUrl?: string;
	enabled?: boolean;
	timeoutMs?: number;
}

export type RspamdSymbol = {
	name: string;
	score: number;
	description?: string;
	options?: string[];
};

export type RspamdResponse = {
	is_skipped?: boolean;
	score: number;
	required_score: number;
	action: "reject" | "add header" | "rewrite subject" | "no action" | "greylist" | string;
	symbols?: Record<string, RspamdSymbol>;
	messages?: Record<string, string>;
};

export class RspamdIntelligenceProvider implements SpamIntelligenceProvider {
	private readonly baseUrl: string;
	private readonly enabled: boolean;
	private readonly timeoutMs: number;

	constructor(options?: RspamdCheckOptions) {
		this.baseUrl = (options?.rspamdUrl || config.rspamd.url || "http://rspamd:11333").replace(/\/$/, "");
		this.enabled = options?.enabled !== false && config.rspamd.enabled;
		this.timeoutMs = options?.timeoutMs ?? 3000;
	}

	async check(input: SpamIntelligenceInput): Promise<SpamSignal[]> {
		if (!this.enabled || !input.rawMime) {
			return [];
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

			const headers: Record<string, string> = {};
			if (input.senderIp) headers["IP"] = input.senderIp;
			if (input.envelopeFrom) headers["From"] = input.envelopeFrom;
			if (input.envelopeTo) headers["Rcpt"] = input.envelopeTo;
			if (input.fingerprint) headers["Queue-ID"] = input.fingerprint;

			const rawBytes = input.rawMime instanceof ArrayBuffer
				? new Uint8Array(input.rawMime)
				: new Uint8Array(input.rawMime.buffer, input.rawMime.byteOffset, input.rawMime.byteLength);

			const res = await fetch(`${this.baseUrl}/checkv2`, {
				method: "POST",
				headers,
				body: rawBytes as unknown as BodyInit,
				signal: controller.signal,
			}).finally(() => clearTimeout(timeoutId));

			if (!res.ok) {
				console.warn(`Rspamd returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
				return [];
			}

			const data = (await res.json()) as RspamdResponse;
			return this.mapResponseToSignals(data);
		} catch (error) {
			// Do not disrupt message delivery if Rspamd is offline or times out
			console.warn("Rspamd spam check failed, falling back to internal classifier:", error instanceof Error ? error.message : error);
			return [];
		}
	}

	private mapResponseToSignals(data: RspamdResponse): SpamSignal[] {
		const signals: SpamSignal[] = [];

		if (data.action === "reject") {
			signals.push({
				id: "rspamd_action_reject",
				score: 100,
				reason: `Rspamd classified message as spam (score: ${data.score.toFixed(1)} / required: ${data.required_score}, action: reject)`,
				metadata: { score: data.score, requiredScore: data.required_score, action: data.action },
			});
		} else if (data.action === "add header" || data.action === "rewrite subject") {
			signals.push({
				id: "rspamd_action_suspicious",
				score: 35,
				reason: `Rspamd marked message as suspicious (score: ${data.score.toFixed(1)} / required: ${data.required_score}, action: ${data.action})`,
				metadata: { score: data.score, requiredScore: data.required_score, action: data.action },
			});
		}

		if (data.symbols) {
			for (const symbol of Object.values(data.symbols)) {
				// Convert Rspamd score (-20 to +20) proportionally into Mailflare score
				const scaledScore = Math.round(symbol.score * 4);
				if (Math.abs(scaledScore) >= 1) {
					signals.push({
						id: `rspamd_${symbol.name.toLowerCase()}`,
						score: scaledScore,
						reason: symbol.description || `Rspamd rule: ${symbol.name}`,
						metadata: {
							symbol: symbol.name,
							originalScore: symbol.score,
							options: symbol.options,
						},
					});
				}
			}
		}

		return signals;
	}
}

export async function checkRspamdHealth(baseUrl: string): Promise<{ ok: boolean; latencyMs?: number; version?: string }> {
	const start = Date.now();
	try {
		const cleanUrl = baseUrl.replace(/\/$/, "");
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2500);

		const res = await fetch(`${cleanUrl}/ping`, {
			method: "GET",
			signal: controller.signal,
		}).finally(() => clearTimeout(timeout));

		const latencyMs = Date.now() - start;
		if (res.ok) {
			return { ok: true, latencyMs };
		}
		return { ok: false, latencyMs };
	} catch {
		return { ok: false, latencyMs: Date.now() - start };
	}
}
