"use client";

import Link from "next/link";
import { useHomeAuth } from "./home-auth";

export function HomeHeroActions() {
	const hasUser = !!useHomeAuth();

	return (
		<div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<Link
				href={hasUser ? "/mail/inbox" : "/register"}
				className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-7 text-[15px] font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				{hasUser ? "Open your inbox" : "Get started"}
			</Link>
			<Link
				href={hasUser ? "/admin/plan" : "/login"}
				className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-300 bg-white px-7 text-[15px] font-medium text-blue-600 transition hover:border-blue-100 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				{hasUser ? "Manage your plan" : "Sign in"}
			</Link>
		</div>
	);
}
