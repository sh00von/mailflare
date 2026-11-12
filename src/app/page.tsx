import type { Metadata } from "next";
import Link from "next/link";
import {
	ArrowRight,
	CheckCircle2,
	ChevronDown,
	Globe2,
	KeyRound,
	Mail,
	Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { PLAN_LIST } from "@/lib/plans/catalog";
import { getHomeBranding } from "./home-server-utils";
import { HomeAuthProvider } from "./home-auth";
import { HomeHeaderActions } from "./home-header-actions";
import { HomeHeroActions } from "./home-hero-actions";
import { HomeInboxPreview } from "./home-inbox-preview";
import { faqs, landingNavItems } from "./utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: branding.appName,
		description:
			"Business email on your own domain. Verify DNS, create team mailboxes in seconds, and keep every message fast and private.",
		icons: { icon: branding.hasCustomIcon ? "/api/branding/icon" : "/icon-96.png" },
	};
}

export default async function HomePage() {
	const [branding, sessionUser] = await Promise.all([
		getHomeBranding(),
		getCurrentUser(getEnv()).catch(() => null),
	]);

	const initialUser = sessionUser
		? {
				id: sessionUser.id,
				email: sessionUser.email,
				name: sessionUser.name,
				role: sessionUser.role,
				hasAvatar: !!sessionUser.avatarKey,
			}
		: null;
	const iconSrc = branding.hasCustomIcon ? "/api/branding/icon" : "/icon-96.png";
	const signedIn = !!initialUser;

	return (
		<HomeAuthProvider initialUser={initialUser}>
			<div className="min-h-dvh bg-background text-neutral-900">
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
				>
					Skip to content
				</a>

				{/* Floating Pill Header */}
				<header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
					<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 rounded-full border border-neutral-200/80 bg-white/85 px-4 shadow-xs backdrop-blur-xl">
						<Link href="/" className="flex items-center gap-2.5 pl-1" aria-label={`${branding.appName} home`}>
							<img src={iconSrc} height={24} width={24} alt="" />
							<span className="text-sm font-semibold tracking-tight text-neutral-950">{branding.appName}</span>
						</Link>

						<nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
							{landingNavItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									className="rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
								>
									{item.labelKey}
								</a>
							))}
						</nav>

						<div className="flex items-center gap-2">
							<HomeHeaderActions />
						</div>
					</div>
				</header>

				<main id="main">
					{/* Centered Editorial Hero */}
					<section className="relative overflow-hidden pb-20 pt-14 sm:pt-20 lg:pb-24">
						<div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
							<div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-medium text-neutral-700 shadow-2xs">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								Business email for custom domains · 14-day free trial
							</div>
							<h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
								Your domain. Your team inbox. Zero bloat.
							</h1>
							<p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-neutral-500 sm:text-lg">
								Set up <code className="font-mono text-sm">@yourcompany.com</code> email for your team in minutes—fast, private, and built for real work.
							</p>
							<div className="mt-8 flex justify-center">
								<HomeHeroActions />
							</div>
							<div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-neutral-500">
								<span>Use your own domain</span>
								<span aria-hidden="true">·</span>
								<span>Shared team inboxes</span>
								<span aria-hidden="true">·</span>
								<span>14-day free trial</span>
							</div>
						</div>

						<div className="mx-auto mt-14 max-w-5xl px-4 sm:px-6 lg:px-8">
							<div className="rounded-3xl border border-neutral-200/80 bg-white p-2 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.3)] sm:p-3">
								<HomeInboxPreview />
							</div>
						</div>
					</section>

					{/* Bento Features */}
					<section id="features" aria-labelledby="features-title" className="scroll-mt-24 py-20">
						<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
							<div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
								<div>
									<p className="font-mono text-xs font-medium uppercase tracking-widest text-neutral-500">Architecture</p>
									<h2 id="features-title" className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
										Built for real teams.
									</h2>
								</div>
								<p className="max-w-sm text-sm leading-6 text-neutral-500">
									Everything required to run custom-domain email cleanly—nothing bolted on.
								</p>
							</div>

							<div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
								{/* Wide card */}
								<div className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 md:col-span-4">
									<div>
										<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900">
											<Globe2 className="h-5 w-5" />
										</div>
										<h3 className="mt-5 text-lg font-semibold text-neutral-950">Your own company domain</h3>
										<p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
											Connect your business domain with simple step-by-step verification so only you control who gets an address on your company name.
										</p>
									</div>
									<div className="mt-6 flex flex-wrap gap-2">
										{["hello@yourcompany.com", "support@yourcompany.com", "sales@yourcompany.com"].map((pill) => (
											<span
												key={pill}
												className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium text-neutral-700"
											>
												<CheckCircle2 className="h-3 w-3 text-emerald-500" />
												{pill}
											</span>
										))}
									</div>
								</div>

								{/* Tall side card */}
								<div className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 md:col-span-2">
									<div>
										<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900">
											<Mail className="h-5 w-5" />
										</div>
										<h3 className="mt-5 text-lg font-semibold text-neutral-950">Shared team mailboxes</h3>
										<p className="mt-2 text-sm leading-6 text-neutral-500">
											Create <code className="font-mono text-xs">hello@</code> or <code className="font-mono text-xs">support@</code> and let teammates read, reply, or manage emails together.
										</p>
									</div>
								</div>

								{/* Bottom left */}
								<div className="rounded-3xl border border-neutral-200/80 bg-white p-7 md:col-span-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900">
										<Sparkles className="h-5 w-5" />
									</div>
									<h3 className="mt-5 text-lg font-semibold text-neutral-950">Private workspace &amp; cloud storage</h3>
									<p className="mt-2 text-sm leading-6 text-neutral-500">
										Every team gets its own private workspace with generous attachment storage and clear, predictable limits.
									</p>
								</div>

								{/* Bottom right */}
								<div className="rounded-3xl border border-neutral-200/80 bg-white p-7 md:col-span-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900">
										<KeyRound className="h-5 w-5" />
									</div>
									<h3 className="mt-5 text-lg font-semibold text-neutral-950">Fast, safe &amp; works everywhere</h3>
									<p className="mt-2 text-sm leading-6 text-neutral-500">
										Two-step sign-in protection, smart spam blocking, scheduled sends, and instant access on desktop or phone.
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Pricing */}
					<section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24 py-20">
						<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
							<div className="text-center">
								<p className="font-mono text-xs font-medium uppercase tracking-widest text-neutral-500">Pricing</p>
								<h2 id="pricing-title" className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
									Transparent limits. Predictable scale.
								</h2>
								<p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-500">
									Every plan includes a 14-day free trial, cloud attachment storage, and guided domain setup.
								</p>
							</div>

							<div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
								{PLAN_LIST.map((plan) => {
									const featured = !!plan.highlighted;
									const planBullets = [
										`${plan.maxDomains} ${plan.maxDomains === 1 ? "custom domain" : "custom domains"}`,
										`Up to ${plan.maxMailboxes} team mailboxes`,
										`${plan.storageLabel} cloud storage`,
										`${plan.dailySendLimit.toLocaleString()} emails / day`,
										`Up to ${plan.maxAttachmentMb} MB attachments`,
									];
									return (
										<div
											key={plan.id}
											className={`flex flex-col justify-between rounded-3xl border p-8 ${
												featured
													? "border-neutral-900 bg-neutral-950 text-white shadow-xl"
													: "border-neutral-200/80 bg-white text-neutral-950"
											}`}
										>
											<div>
												<div className="flex items-center justify-between gap-2">
													<h3 className="text-base font-semibold">{plan.name}</h3>
													{featured && (
														<span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white">
															Popular
														</span>
													)}
												</div>
												<p className={`mt-1.5 text-xs ${featured ? "text-neutral-400" : "text-neutral-500"}`}>
													{plan.tagline}
												</p>
												<div className="mt-6 flex items-baseline gap-1">
													<span className="text-4xl font-semibold tracking-tight">${plan.priceMonthlyUsd}</span>
													<span className={`text-xs ${featured ? "text-neutral-400" : "text-neutral-500"}`}>/ month</span>
												</div>
												<ul className={`mt-6 space-y-2.5 border-t pt-6 text-sm ${featured ? "border-white/10 text-neutral-200" : "border-neutral-100 text-neutral-700"}`}>
													{planBullets.map((item) => (
														<li key={item} className="flex items-center gap-2.5">
															<CheckCircle2 className={`h-4 w-4 shrink-0 ${featured ? "text-emerald-400" : "text-emerald-600"}`} />
															<span>{item}</span>
														</li>
													))}
												</ul>
											</div>
											<Button
												asChild
												size="lg"
												variant={featured ? "secondary" : "outline"}
												className={`mt-8 w-full rounded-full ${
													featured ? "bg-white text-neutral-950 hover:bg-neutral-200" : ""
												}`}
											>
												<Link href={signedIn ? "/plan" : `/register?plan=${plan.id}`}>
													{signedIn ? "Manage plan" : `Start ${plan.name} trial`}
													<ArrowRight className="h-4 w-4" />
												</Link>
											</Button>
										</div>
									);
								})}
							</div>
						</div>
					</section>

					{/* FAQ */}
					<section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-16">
						<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
							<h2 id="faq-title" className="text-center text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
								Questions &amp; answers
							</h2>
							<div className="mt-8 divide-y divide-neutral-200 rounded-3xl border border-neutral-200/80 bg-white px-6">
								{faqs.slice(0, 4).map((faq) => (
									<details key={faq.questionKey} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
										<summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-sm font-medium text-neutral-950 sm:text-base">
											{faq.questionKey}
											<ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<p className="mt-2.5 pr-8 text-sm leading-6 text-neutral-500">{faq.answerKey}</p>
									</details>
								))}
							</div>
						</div>
					</section>

					{/* Final CTA */}
					<section aria-labelledby="cta-title" className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
						<div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-3xl border border-neutral-200/80 bg-white px-8 py-12 text-center md:flex-row md:text-left">
							<div>
								<h2 id="cta-title" className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
									Ready for your own domain?
								</h2>
								<p className="mt-2 text-sm text-neutral-500">
									Start your 14-day free trial and launch team mailboxes in minutes.
								</p>
							</div>
							<div className="flex shrink-0 flex-wrap items-center gap-3">
								<Button size="lg" asChild className="rounded-full px-6">
									<Link href={signedIn ? "/inbox" : "/register"}>
										{signedIn ? "Open dashboard" : "Create workspace"}
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
								{!signedIn && (
									<Button size="lg" variant="outline" asChild className="rounded-full px-6">
										<Link href="/login">Sign in</Link>
									</Button>
								)}
							</div>
						</div>
					</section>
				</main>

				<footer className="border-t border-neutral-200/70">
					<div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-7 text-xs text-neutral-500 sm:flex-row sm:px-6 lg:px-8">
						<div className="flex items-center gap-2">
							<img src={iconSrc} height={18} width={18} alt="" />
							<span>{`© ${String(new Date().getFullYear())} ${branding.appName}`}</span>
						</div>
						<nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							{landingNavItems.map((item) => (
								<a key={item.href} href={item.href} className="hover:text-neutral-900">
									{item.labelKey}
								</a>
							))}
							{!signedIn && (
								<>
									<Link href="/login" className="hover:text-neutral-900">
										Sign in
									</Link>
									<Link href="/register" className="hover:text-neutral-900">
										Create account
									</Link>
								</>
							)}
						</nav>
					</div>
				</footer>
			</div>
		</HomeAuthProvider>
	);
}
