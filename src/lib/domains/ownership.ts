import { resolveMx, resolveTxt } from "node:dns/promises";

export type DomainOwnershipCheck = {
	ok: boolean;
	expectedMx: string;
	mxOk: boolean;
	spfOk: boolean;
	dmarcOk: boolean;
	/** MAIL_HOSTNAME is not set, so ownership cannot be proven at all. */
	unconfigured?: boolean;
};

/**
 * Our inbound mail host (MAIL_HOSTNAME). There is deliberately no `mail.<domain>` fallback: many domains already
 * point MX at their own `mail.` host for another provider, so it would prove nothing about pointing at us.
 */
export function ourMailHost(): string | null {
	return process.env.MAIL_HOSTNAME?.trim().toLowerCase().replace(/\.$/, "") || null;
}

/** Whether an SPF record authorises `host` through an exact `a:`, `mx:` or `include:` mechanism, or a bare `mx`. */
export function spfAuthorises(record: string, host: string, mxPointsAtHost: boolean): boolean {
	const terms = record.trim().toLowerCase().split(/\s+/);
	if (terms[0] !== "v=spf1") return false;
	return terms.slice(1).some((term) => {
		const mechanism = term.replace(/^[+?~-]/, "");
		if (mechanism === "mx") return mxPointsAtHost;
		const [name, value] = mechanism.split(":", 2);
		return (name === "a" || name === "mx" || name === "include") && value?.replace(/\/\d+$/, "").replace(/\.$/, "") === host;
	});
}

/**
 * Proves control of a domain from its public DNS: MX at our mail host, an SPF record naming it and a DMARC record.
 * Only someone who can edit the zone can publish these, so a domain without Cloudflare zone access must pass this
 * before it is recorded, or any tenant could claim (and send as) a domain they do not own.
 */
export async function checkDomainOwnershipDns(hostname: string): Promise<DomainOwnershipCheck> {
	const domain = hostname.toLowerCase().trim().replace(/\.$/, "");
	const ourHost = ourMailHost();
	// Without our own mail host configured there is nothing a domain could point at to prove control.
	if (!ourHost) return { ok: false, expectedMx: "", mxOk: false, spfOk: false, dmarcOk: false, unconfigured: true };
	const expectedMx = ourHost;
	const [currentMx, rootTxt, dmarcTxt] = await Promise.all([
		resolveMx(domain).then((recs) => recs.map((r) => r.exchange.trim().toLowerCase().replace(/\.$/, ""))).catch(() => [] as string[]),
		resolveTxt(domain).then((recs) => recs.map((chunks) => chunks.join("").trim().toLowerCase())).catch(() => [] as string[]),
		resolveTxt(`_dmarc.${domain}`).then((recs) => recs.map((chunks) => chunks.join("").trim().toLowerCase())).catch(() => [] as string[]),
	]);
	const mxOk = currentMx.includes(expectedMx);
	const spfOk = rootTxt.some((txt) => spfAuthorises(txt, expectedMx, mxOk));
	const dmarcOk = dmarcTxt.some((txt) => txt.startsWith("v=dmarc1"));
	return { ok: mxOk && spfOk && dmarcOk, expectedMx, mxOk, spfOk, dmarcOk };
}

export class DomainOwnershipError extends Error {
	constructor(readonly check: DomainOwnershipCheck) {
		if (check.unconfigured) {
			super("This server has no MAIL_HOSTNAME set, so domain ownership cannot be verified. Set MAIL_HOSTNAME to this server's mail host.");
			this.name = "DomainOwnershipError";
			return;
		}
		const missing = [!check.mxOk && `MX → ${check.expectedMx}`, !check.spfOk && "SPF (v=spf1 including the mail host)", !check.dmarcOk && "DMARC (_dmarc TXT)"].filter(Boolean);
		super(`Domain ownership is not verified. Publish these DNS records first: ${missing.join(", ")}.`);
		this.name = "DomainOwnershipError";
	}
}
