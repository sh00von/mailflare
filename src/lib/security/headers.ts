// Dev tooling (HMR, source maps) evaluates strings; production never needs to.
const scriptEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const csp = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${scriptEval} https://js.stripe.com`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"connect-src 'self' ws: wss: https://api.stripe.com",
	// 'self' lets the Drive preview show PDFs and text files in an iframe; Stripe requires iframe for 3DS & checkout.
	"frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self' https://checkout.stripe.com",
	"frame-ancestors 'self'",
	"upgrade-insecure-requests",
].join("; ");

export function getSecurityHeaders() {
	return [
		{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
		{ key: "Content-Security-Policy", value: csp },
		{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
		{ key: "X-Content-Type-Options", value: "nosniff" },
		{ key: "X-Frame-Options", value: "SAMEORIGIN" },
		// OWASP modern recommendation: disable legacy X-XSS-Protection to prevent auditor vulnerabilities
		{ key: "X-XSS-Protection", value: "0" },
		// No window the app opens or that opens the app keeps a reference to it.
		{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
		{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
		{
			key: "Permissions-Policy",
			value: "camera=(), microphone=(), geolocation=(), usb=()",
		},
	];
}
