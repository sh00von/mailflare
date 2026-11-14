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
		<div className="relative flex min-h-dvh flex-col bg-slate-50 text-neutral-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
			{/* Ambient background glow for modern startup atmosphere */}
			<div className="pointer-events-none absolute -top-40 left-1/2 h-[450px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl" />
			<div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-400/5 blur-3xl" />

			<main className="relative z-10 flex flex-1 items-start justify-center sm:items-center px-3 py-4 sm:px-6 sm:py-12">
				<div
					className={`w-full bg-white/95 px-5 py-6 sm:p-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-slate-200/80 shadow-lg shadow-slate-200/40 sm:shadow-xl sm:shadow-slate-200/50 ${
						wide ? "max-w-5xl" : "max-w-4xl"
					}`}
				>
					<div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12">
						<section className="min-w-0">
							<Link href="/" className="group inline-flex items-center gap-2.5 rounded-xl transition hover:opacity-85" aria-label={`${branding.appName} home`}>
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
										className="h-9 w-9 object-contain drop-shadow-xs"
									/>
								)}
								<span className="truncate text-lg font-semibold tracking-tight text-neutral-800 group-hover:text-neutral-950">{branding.appName}</span>
							</Link>

							<h1 className="mt-5 sm:mt-8 text-balance text-2xl font-bold leading-tight tracking-[-0.02em] text-neutral-950 sm:text-[34px]">
								{title}
							</h1>
							{description && <p className="mt-2.5 sm:mt-3.5 max-w-md text-sm leading-relaxed text-neutral-600">{description}</p>}


							{steps && steps.length > 0 && (
								<ol className="mt-6 flex flex-row items-center gap-x-2 gap-y-2 overflow-x-auto pb-1 -mx-1 px-1 md:mt-8 md:flex-col md:items-start md:gap-0 md:overflow-visible" aria-label="Progress">
									{steps.map((step, index) => (
										<li key={step.label} className="flex items-center gap-2 shrink-0 md:shrink md:flex-col md:items-start md:gap-0">
											<span className="flex items-center gap-2.5 sm:gap-3" aria-current={step.active ? "step" : undefined}>
												<span
													className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
														step.done
															? "bg-blue-600 text-white shadow-xs"
															: step.active
																? "border-2 border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
																: "border border-neutral-300 text-neutral-500"
													}`}
												>
													{step.done ? <Check className="h-4 w-4" /> : index + 1}
												</span>
												<span className={`text-xs sm:text-sm whitespace-nowrap md:whitespace-normal ${step.active ? "font-semibold text-neutral-900" : "text-neutral-500"}`}>{step.label}</span>
											</span>
											{index < steps.length - 1 && (
												<span
													aria-hidden="true"
													className={`h-px w-4 sm:w-6 shrink-0 md:my-1.5 md:ml-3.5 md:h-5 md:w-px ${step.done ? "bg-blue-600" : "bg-neutral-200"}`}
												/>
											)}
										</li>
									))}
								</ol>
							)}
						</section>

						<section className="min-w-0 md:pt-[3.75rem]">
							{children}
							{footer && <div className="mt-6 sm:mt-8 text-sm text-neutral-600">{footer}</div>}
						</section>
					</div>
				</div>
			</main>
			<footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-neutral-500">
				<span>{`© ${new Date().getFullYear()} ${branding.appName}. All rights reserved.`}</span>
				<nav aria-label="Footer" className="flex items-center gap-1.5">
					<Link href="/" className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-200/60 hover:text-neutral-900">
						Home
					</Link>
					<Link href="/#pricing" className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-200/60 hover:text-neutral-900">
						Pricing
					</Link>
					<Link href="/#faq" className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-200/60 hover:text-neutral-900">
						Help
					</Link>
				</nav>
			</footer>
		</div>
	);
}
