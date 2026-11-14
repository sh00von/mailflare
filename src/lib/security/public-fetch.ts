import { lookup, type LookupAddress, type LookupAllOptions } from "node:dns";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isPublicAddress } from "@/lib/remote-images/fetch";

/**
 * Callers check a hostname over DoH before fetching, but the socket resolves it again, so a DNS-rebinding host
 * can answer public to the check and private to the connection. This agent re-checks the addresses the socket is
 * about to use and refuses non-public ones, closing that window.
 */
const publicOnlyAgent = new Agent({
	connect: {
		lookup: ((hostname: string, options: LookupAllOptions, callback: (error: Error | null, address?: string | LookupAddress[], family?: number) => void) => {
			lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
				if (error) return callback(error);
				if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
					return callback(Object.assign(new Error(`Refusing non-public address for ${hostname}`), { code: "ENOTPUBLIC" }));
				}
				if ((options as { all?: boolean }).all) return callback(null, addresses);
				return callback(null, addresses[0].address, addresses[0].family);
			});
		}) as unknown as LookupFunction,
	},
});

/**
 * `fetch` that can only connect to public addresses. An IP-literal URL skips the DNS lookup the agent checks,
 * so literals are validated here; redirects are never followed, so callers re-validate each hop themselves.
 */
export async function publicOnlyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (isIP(host) && !isPublicAddress(host)) throw Object.assign(new Error(`Refusing non-public address ${host}`), { code: "ENOTPUBLIC" });
	return undiciFetch(url, { ...(init as Parameters<typeof undiciFetch>[1]), redirect: "manual", dispatcher: publicOnlyAgent }) as unknown as Promise<Response>;
}
