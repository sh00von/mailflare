import { resolveMx, resolveTxt } from "node:dns/promises";

export type DomainOwnershipCheck = {
	ok: boolean;
	expectedMx: string;
	mxOk: boolean;
	spfOk: boolean;
	dmarcOk: boolean;
};

/** The MX host a hosted domain must point at; MAIL_HOSTNAME when set, else mail.<domain>. */
export function expectedMxFor(hostname: string): string {
	return (process.env.MAIL_HOSTNAME?.trim() || `mail.${hostname}`).toLowerCase().replace(/\.$/, "");
}

/**
 * Proves control of a domain from its public DNS: MX at our mail host, an SPF record naming it and a DMARC record.
 * Only someone who can edit the zone can publish these, so a domain without Cloudflare zone access must pass this
 * before it is recorded, or any tenant could claim (and send as) a domain they do not own.
 */
export async function checkDomainOwnershipDns(hostname: string): Promise<DomainOwnershipCheck> {
	const domain = hostname.toLowerCase().trim().replace(/\.$/, "");
	const expectedMx = expectedMxFor(domain);
	const [currentMx, rootTxt, dmarcTxt] = await Promise.all([
		resolveMx(domain).then((recs) => recs.map((r) => r.exchange.trim().toLowerCase().replace(/\.$/, ""))).catch(() => [] as string[]),
		resolveTxt(domain).then((recs) => recs.map((chunks) => chunks.join("").trim().toLowerCase())).catch(() => [] as string[]),
		resolveTxt(`_dmarc.${domain}`).then((recs) => recs.map((chunks) => chunks.join("").trim().toLowerCase())).catch(() => [] as string[]),
	]);
	const mxOk = currentMx.includes(expectedMx);
	const spfOk = rootTxt.some((txt) => txt.startsWith("v=spf1") && txt.includes(expectedMx));
	const dmarcOk = dmarcTxt.some((txt) => txt.startsWith("v=dmarc1"));
	return { ok: mxOk && spfOk && dmarcOk, expectedMx, mxOk, spfOk, dmarcOk };
}

export class DomainOwnershipError extends Error {
	constructor(readonly check: DomainOwnershipCheck) {
		const missing = [!check.mxOk && `MX → ${check.expectedMx}`, !check.spfOk && "SPF (v=spf1 including the mail host)", !check.dmarcOk && "DMARC (_dmarc TXT)"].filter(Boolean);
		super(`Domain ownership is not verified. Publish these DNS records first: ${missing.join(", ")}.`);
		this.name = "DomainOwnershipError";
	}
}
