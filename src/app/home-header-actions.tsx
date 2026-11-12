"use client";

import Link from "next/link";
import { HomeAccountMenu } from "./home-account-menu";
import { useHomeAuth } from "./home-auth";

export function HomeHeaderActions() {
	const user = useHomeAuth();
	if (user) return <HomeAccountMenu user={user} />;

	return (
		<>
			<Link
				href="/login"
				className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-blue-600 transition hover:bg-blue-50 sm:inline-flex"
			>
				Sign in
			</Link>
			<Link
				href="/register"
				className="inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-sm"
			>
				Get started
			</Link>
		</>
	);
}
