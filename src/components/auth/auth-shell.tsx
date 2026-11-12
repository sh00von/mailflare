"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBranding } from "@/components/branding-provider";
import { Check } from "@/components/icons";
import type { AuthShellProps } from "./types";

/**
 * Sign-in style card: a white card on a light grey page, with the brand, title and description on
 * the left and the form on the right (stacked on small screens).
 */
export function AuthShell({ icon: Icon, title, description, children, footer, steps, wide = false }: AuthShellProps) {
	const branding = useBranding();
	const [iconUrl, setIconUrl] = useState(branding.iconUrl);
	const [iconFailed, setIconFailed] = useState(false);

	useEffect(() => {
		setIconUrl(branding.iconUrl);
		setIconFailed(false);
	}, [branding.iconUrl]);

	return (
		<div className="flex min-h-dvh flex-col bg-neutral-100 text-neutral-900">
			<main className="flex flex-1 items-start justify-center sm:items-center sm:px-6 sm:py-10">
				<div
					className={`w-full bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:rounded-[28px] sm:p-10 ${
						wide ? "max-w-5xl" : "max-w-4xl"
					}`}
				>
					<div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12">
						<section className="min-w-0">
							<Link href="/" className="inline-flex items-center gap-2.5 rounded-lg" aria-label={`${branding.appName} home`}>
								{iconFailed ? (
									<Icon className="h-9 w-9 text-blue-600" />
								) : (
									<img
										src={iconUrl}
										onError={() => {
											if (iconUrl !== "/icon-96.png") setIconUrl("/icon-96.png");
											else setIconFailed(true);
										}}
										alt=""
										className="h-9 w-9 object-contain"
									/>
								)}
								<span className="truncate text-lg font-medium text-neutral-500">{branding.appName}</span>
							</Link>

							<h1 className="mt-8 text-balance text-[32px] font-normal leading-tight tracking-[-0.01em] text-neutral-900 sm:text-[36px]">
								{title}
							</h1>
							{description && <p className="mt-4 max-w-md text-base leading-7 text-neutral-700">{description}</p>}

							{steps && steps.length > 0 && (
								<ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3 md:flex-col md:items-start md:gap-0" aria-label="Progress">
									{steps.map((step, index) => (
										<li key={step.label} className="flex items-center gap-2 md:flex-col md:items-start md:gap-0">
											<span className="flex items-center gap-3" aria-current={step.active ? "step" : undefined}>
												<span
													className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition ${
														step.done
															? "bg-blue-600 text-white"
															: step.active
																? "border-2 border-blue-600 text-blue-600"
																: "border border-neutral-300 text-neutral-500"
													}`}
												>
													{step.done ? <Check className="h-4 w-4" /> : index + 1}
												</span>
												<span className={`text-sm ${step.active ? "font-medium text-neutral-900" : "text-neutral-500"}`}>{step.label}</span>
											</span>
											{index < steps.length - 1 && (
												<span
													aria-hidden="true"
													className={`h-px w-6 md:my-1 md:ml-3.5 md:h-5 md:w-px ${step.done ? "bg-blue-600" : "bg-neutral-300"}`}
												/>
											)}
										</li>
									))}
								</ol>
							)}
						</section>

						<section className="min-w-0 md:pt-[4.25rem]">
							{children}
							{footer && <div className="mt-8 text-sm text-neutral-700">{footer}</div>}
						</section>
					</div>
				</div>
			</main>
			<footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-neutral-500">
				<span>{`© ${new Date().getFullYear()} ${branding.appName}`}</span>
				<nav aria-label="Footer" className="flex items-center gap-1">
					<Link href="/" className="rounded-md px-2 py-1.5 transition hover:bg-neutral-200 hover:text-neutral-900">
						Home
					</Link>
					<Link href="/#pricing" className="rounded-md px-2 py-1.5 transition hover:bg-neutral-200 hover:text-neutral-900">
						Pricing
					</Link>
					<Link href="/#faq" className="rounded-md px-2 py-1.5 transition hover:bg-neutral-200 hover:text-neutral-900">
						Help
					</Link>
				</nav>
			</footer>
		</div>
	);
}
