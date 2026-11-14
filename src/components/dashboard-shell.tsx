"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { DashboardNav } from "@/components/dashboard-nav";

const adminPrefixes = ["/dash", "/admin", "/mailboxes", "/domains", "/api-keys", "/activity", "/audit-logs", "/webhooks", "/branding", "/plan", "/workspaces", "/general", "/accounts", "/spam-filter", "/backups"];

export function DashboardShellNav() {
	const pathname = usePathname();
	const isAdmin = adminPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

	return isAdmin ? <AdminNav /> : <DashboardNav />;
}
