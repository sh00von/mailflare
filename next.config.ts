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
			{ source: "/dash", destination: "/domains" },
			{ source: "/dash/:path*", destination: "/:path*" },
			{ source: "/mail", destination: "/inbox" },
			{ source: "/mail/:path*", destination: "/:path*" },
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
