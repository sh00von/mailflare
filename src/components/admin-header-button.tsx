"use client";

import Link from "next/link";
import { ShieldCheck } from "@/components/icons";
import { useCurrentUser } from "@/hooks/use-current-user";

export function AdminHeaderButton() {
	const user = useCurrentUser();
	const isAdmin = Boolean(
		user?.role === "admin" ||
		user?.isPrimaryAdmin ||
		user?.canManageDomains ||
		user?.canManageUsers
	);

	if (!isAdmin) return null;

	return (
		<Link
			href="/admin/domains"
			className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-neutral-200/90 bg-white p-2.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-purple-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
			title="Open Admin Console"
			aria-label="Open Admin Console"
		>
			<ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
			<span className="hidden sm:inline">Admin Console</span>
		</Link>
	);
}
