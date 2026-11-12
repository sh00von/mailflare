import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { sidebarBootstrapScript } from "@/components/sidebar-state-utils";
import { themeBootstrapScript } from "@/components/theme-utils";
import { getHomeBranding } from "./home-server-utils";
import "./globals.css";

const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
	const { appName } = await getHomeBranding();
	return {
		title: appName,
		description: "Business email on your own domain",
		icons: { icon: "/api/branding/icon", apple: "/icon-192.png" },
		appleWebApp: {
			capable: true,
			title: appName,
			statusBarStyle: "default",
		},
		robots: {
			index: false,
			follow: false,
			noarchive: true,
			nosnippet: true,
			noimageindex: true,
			googleBot: {
				index: false,
				follow: false,
				noarchive: true,
				nosnippet: true,
				noimageindex: true,
			},
		},
	};
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const branding = await getHomeBranding();
	return (
		<html lang="en" dir="ltr" data-remote-image-proxy="enabled" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: sidebarBootstrapScript }} />
				<script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
			</head>
			<body className={`${poppins.variable} ${geistMono.variable} antialiased`}>
				<Providers initialBranding={branding}>{children}</Providers>
			</body>
		</html>
	);
}
