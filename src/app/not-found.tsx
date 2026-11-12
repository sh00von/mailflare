import Link from "next/link";
import { ArrowRight, Mail } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-4 py-16 text-neutral-900">
			<div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
					<Mail className="h-6 w-6" />
				</div>
				<p className="mt-5 text-xs font-semibold uppercase tracking-widest text-blue-700">404</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
					Page not found
				</h1>
				<p className="mt-2 text-sm leading-6 text-neutral-600">
					The page you are looking for does not exist or may have been moved.
				</p>
				<div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
					<Button asChild className="rounded-full px-6">
						<Link href="/">
							Go to home
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
					<Button asChild variant="outline" className="rounded-full px-6">
						<Link href="/inbox">Open inbox</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}

