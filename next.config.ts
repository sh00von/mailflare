import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
	distDir: ".next-node",
	poweredByHeader: false,
	turbopack: {
		root: import.meta.dirname,
	},
  allowedDevOrigins: ['mail.dev'],
	typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete
    // even if your project has type errors.
    ignoreBuildErrors: true,
	  },
	// Native and server-only packages used by the self-hosted runtime; never bundle them.
	serverExternalPackages: ["nodemailer", "smtp-server", "ws", "undici"],
	async rewrites() {
		return [
			{ source: "/admin/domains", destination: "/domains" },
			{ source: "/admin/mailboxes", destination: "/accounts" },
			{ source: "/admin/mailboxes/:path*", destination: "/accounts/:path*" },
			{ source: "/admin/plan", destination: "/plan" },
			{ source: "/admin/workspaces", destination: "/workspaces" },
			{ source: "/admin/spam-filter", destination: "/spam-filter" },
			{ source: "/admin/backups", destination: "/backups" },
			{ source: "/admin/audit-logs", destination: "/audit-logs" },
			{ source: "/admin/activity", destination: "/activity" },
			{ source: "/admin/general", destination: "/general" },
			{ source: "/admin/:path*", destination: "/:path*" },
			{ source: "/mail", destination: "/inbox" },
			{ source: "/mail/inbox", destination: "/inbox" },
			{ source: "/mail/sent", destination: "/sent" },
			{ source: "/mail/drafts", destination: "/drafts" },
			{ source: "/mail/trash", destination: "/trash" },
			{ source: "/mail/spam", destination: "/spam" },
			{ source: "/mail/starred", destination: "/starred" },
			{ source: "/mail/archived", destination: "/archived" },
			{ source: "/mail/scheduled", destination: "/scheduled" },
			{ source: "/mail/snoozed", destination: "/snoozed" },
			{ source: "/mail/compose", destination: "/compose" },
			{ source: "/mail/import-export", destination: "/import-export" },
			{ source: "/mail/settings", destination: "/settings" },
			{ source: "/mail/folders/:path*", destination: "/folders/:path*" },
			{ source: "/mail/settings/:path*", destination: "/settings/:path*" },
			{ source: "/mail/:path*", destination: "/:path*" },
			{ source: "/dash", destination: "/domains" },
			{ source: "/dash/:path*", destination: "/:path*" },
		];
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: getSecurityHeaders(),
			},
		];
	},
};

export default nextConfig;
