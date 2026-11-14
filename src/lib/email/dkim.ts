import { generateKeyPairSync } from "node:crypto";

export type DkimKeyPair = {
	privateKey: string;
	publicKey: string;
	selector: string;
};

/**
 * Generates an RSA 2048-bit DKIM keypair for a domain.
 * The public key is returned as a single-line base64 string ready for the DNS TXT record.
 */
export function generateDkimKeyPair(selector = "default"): DkimKeyPair {
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: {
			type: "spki",
			format: "pem",
		},
		privateKeyEncoding: {
			type: "pkcs8",
			format: "pem",
		},
	});

	// Strip PEM headers and whitespace to get raw base64 for DNS TXT
	const cleanPublicKey = publicKey
		.replace(/-----BEGIN PUBLIC KEY-----/g, "")
		.replace(/-----END PUBLIC KEY-----/g, "")
		.replace(/\s+/g, "");

	return {
		privateKey,
		publicKey: cleanPublicKey,
		selector,
	};
}

/**
 * Returns formatted DNS record info for DKIM.
 */
export function formatDkimDnsRecord(selector: string, domain: string, cleanPublicKey: string) {
	return {
		type: "TXT",
		name: `${selector}._domainkey.${domain}`,
		value: `v=DKIM1; k=rsa; p=${cleanPublicKey}`,
	};
}
