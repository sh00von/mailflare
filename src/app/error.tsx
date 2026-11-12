"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[replyot] Route error:", error);
	}, [error]);

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-4 py-16 text-neutral-900">
			<div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
					<AlertTriangle className="h-6 w-6" />
				</div>
				<h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
					Something went wrong
				</h1>
				<p className="mt-2 text-sm leading-6 text-neutral-600">
					We hit an unexpected server error while loading this page. You can try again or head back home.
				</p>
				{error.digest && (
					<p className="mt-3 font-mono text-xs text-neutral-400">
						Reference: {error.digest}
					</p>
				)}
				<div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
					<Button type="button" onClick={() => reset()} className="rounded-full px-6">
						<RefreshCw className="h-4 w-4" />
						Try again
					</Button>
					<Button asChild variant="outline" className="rounded-full px-6">
						<Link href="/">Back to home</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}

