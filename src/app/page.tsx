import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getHomeBranding } from "./home-server-utils";
import { HomeAuthProvider } from "./home-auth";
import { HomeHeaderActions } from "./home-header-actions";
import { HomeHeroActions } from "./home-hero-actions";
import { HomeInboxPreview } from "./home-inbox-preview";
import { everywherePoints, faqs, features, landingNavItems, providerNames, securityPoints, steps } from "./utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: branding.appName,
		description: "Bring your domain, create mailboxes and aliases in seconds, and give everyone a fast, focused inbox with smart routing, strong spam protection and sign-in you can trust.",
		icons: { icon: branding.hasCustomIcon ? "/api/branding/icon" : "/icon-96.png" },
	};
}

function SectionHeading({ eyebrow, title, subtitle, id }: { eyebrow: string; title: string; subtitle?: string; id: string }) {
	return (
		<div className="mx-auto max-w-2xl text-center">
			<p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
			<h2 id={id} className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
				{title}
			</h2>
			{subtitle && <p className="mt-4 text-pretty text-lg leading-8 text-neutral-600">{subtitle}</p>}
		</div>
	);
}

export default async function HomePage() {
	const [branding, sessionUser] = await Promise.all([
		getHomeBranding(),
		// A session lookup failure must not take down the public landing page.
		getCurrentUser(getEnv()).catch(() => null),
	]);
	// Render the signed-in account from the server response so the header does not
	// wait for hydration and an /api/auth/me round trip before showing it.
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

				<header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-background/80 backdrop-blur-md">
					<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
						<Link href="/" className="flex items-center gap-2.5" aria-label={`${branding.appName} home`}>
							<img src={iconSrc} height={28} width={28} alt="" />
							<span className="text-base font-semibold tracking-tight">{branding.appName}</span>
						</Link>

						<nav aria-label={"Page sections"} className="hidden items-center gap-1 md:flex">
							{landingNavItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
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
					{/* Hero */}
					<section className="relative overflow-hidden">
						<div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:px-8 lg:pb-28">
							<div className="max-w-xl">
								<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
									<ShieldCheck className="h-4 w-4" />
									Business email on your own domain
								</div>
								<h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
									Email that works the way your team does.
								</h1>
								<p className="mt-6 text-pretty text-lg leading-8 text-neutral-600">Bring your domain, create mailboxes and aliases in seconds, and give everyone a fast, focused inbox with smart routing, strong spam protection and sign-in you can trust.</p>
								<HomeHeroActions />
								<ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
									{["Unlimited domains", "Passkeys and 2FA", "Works on phone and desktop"].map((key) => (
										<li key={key} className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-blue-600" />
											{key}
										</li>
									))}
								</ul>
							</div>

							<HomeInboxPreview />
						</div>
					</section>

					{/* Providers */}
					<section aria-labelledby="providers-title" className="border-y border-neutral-200/70 bg-white">
						<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
							<p id="providers-title" className="text-center text-sm font-medium text-neutral-500">
								Send and receive through the providers you already trust
							</p>
							<ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
								{providerNames.map((name) => (
									<li key={name} className="text-lg font-semibold tracking-tight text-neutral-400">
										{name}
									</li>
								))}
							</ul>
						</div>
					</section>

					{/* Features */}
					<section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-24 sm:py-28">
						<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
							<SectionHeading
								id="features-title"
								eyebrow={"Features"}
								title={"Everything a modern inbox needs, nothing it doesn't."}
								subtitle={"A calm, keyboard-friendly workspace for people who live in their email, with the controls admins need behind it."}
							/>
							<ul className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{features.map((feature) => {
									const Icon = feature.icon;
									return (
										<li
											key={feature.titleKey}
											className="group rounded-2xl border border-neutral-200/80 bg-white p-6 transition-shadow hover:shadow-[0_12px_40px_-24px_rgba(11,87,208,0.45)]"
										>
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
												<Icon className="h-5 w-5" />
											</div>
											<h3 className="mt-5 text-base font-semibold text-neutral-950">{feature.titleKey}</h3>
											<p className="mt-2 text-[15px] leading-7 text-neutral-600">{feature.bodyKey}</p>
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					{/* How it works */}
					<section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 bg-white py-24 sm:py-28">
						<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
							<SectionHeading id="how-title" eyebrow={"How it works"} title={"Live in three steps."} />
							<div className="relative mt-16">
							<div className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-neutral-200 md:block" aria-hidden="true" />
							<ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
								{steps.map((step, index) => {
									const Icon = step.icon;
									return (
										<li key={step.titleKey} className="relative flex flex-col items-center text-center">
											<div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 ring-8 ring-white">
												<Icon className="h-5 w-5" />
												<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
													{index + 1}
												</span>
											</div>
											<h3 className="mt-6 text-lg font-semibold text-neutral-950">{step.titleKey}</h3>
											<p className="mt-2 max-w-xs text-[15px] leading-7 text-neutral-600">{step.bodyKey}</p>
										</li>
									);
								})}
							</ol>
							</div>
						</div>
					</section>

					{/* Security */}
					<section id="security" aria-labelledby="security-title" className="scroll-mt-20 py-24 sm:py-28">
						<div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
							<div>
								<p className="text-sm font-semibold text-blue-700">Security</p>
								<h2 id="security-title" className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
									Private by default. Secure without the friction.
								</h2>
								<p className="mt-4 text-pretty text-lg leading-8 text-neutral-600">Strong sign-in, careful handling of remote content and an audit trail for admins, built in rather than bolted on.</p>
							</div>
							<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{securityPoints.map((point) => {
									const Icon = point.icon;
									return (
										<li key={point.titleKey} className="rounded-2xl border border-neutral-200/80 bg-white p-5">
											<Icon className="h-5 w-5 text-blue-700" />
											<h3 className="mt-4 font-semibold text-neutral-950">{point.titleKey}</h3>
											<p className="mt-1.5 text-sm leading-6 text-neutral-600">{point.bodyKey}</p>
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					{/* Everywhere */}
					<section aria-labelledby="everywhere-title" className="px-4 sm:px-6 lg:px-8">
						<div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 rounded-3xl border border-neutral-200/80 bg-white p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
							<div>
								<p className="text-sm font-semibold text-blue-700">Everywhere</p>
								<h2 id="everywhere-title" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
									On every screen you use.
								</h2>
								<p className="mt-4 text-pretty text-lg leading-8 text-neutral-600">Install it as an app on desktop and mobile, get instant push notifications for new mail, and connect native mail apps over JMAP.</p>
							</div>
							<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{everywherePoints.map((point) => {
									const Icon = point.icon;
									return (
										<li key={point.titleKey} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3.5 text-sm font-medium text-neutral-800">
											<Icon className="h-5 w-5 shrink-0 text-blue-700" />
											{point.titleKey}
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					{/* FAQ */}
					<section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-24 sm:py-28">
						<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
							<h2 id="faq-title" className="text-center text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
								Frequently asked questions
							</h2>
							<div className="mt-12 divide-y divide-neutral-200 border-y border-neutral-200">
								{faqs.map((faq) => (
									<details key={faq.questionKey} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
										<summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md text-left text-base font-medium text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
											{faq.questionKey}
											<ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<p className="mt-3 pr-10 text-[15px] leading-7 text-neutral-600">{faq.answerKey}</p>
									</details>
								))}
							</div>
						</div>
					</section>

					{/* Final CTA */}
					<section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-6 lg:px-8">
						<div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-16 text-center sm:px-12">
							<div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/60 blur-2xl" aria-hidden="true" />
							<div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-blue-700/60 blur-2xl" aria-hidden="true" />
							<h2 id="cta-title" className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
								Give your team an inbox they will enjoy.
							</h2>
							<p className="relative mx-auto mt-4 max-w-xl text-lg text-blue-100">Create your account, add a domain and send your first message in a few minutes.</p>
							<div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
								<Button size="lg" asChild className="rounded-full bg-white px-6 text-blue-700 hover:bg-blue-50">
									<Link href={signedIn ? "/inbox" : "/register"}>
										{signedIn ? "Open dashboard" : "Create account"}
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
								{!signedIn && (
									<Button
										size="lg"
										variant="ghost"
										asChild
										className="rounded-full px-6 text-white hover:bg-white/10 hover:text-white"
									>
										<Link href="/login">Log in</Link>
									</Button>
								)}
							</div>
						</div>
					</section>
				</main>

				<footer className="border-t border-neutral-200/70">
					<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:px-6 lg:px-8">
						<div className="flex items-center gap-2.5">
							<img src={iconSrc} height={20} width={20} alt="" />
							<span>{`© ${String(new Date().getFullYear())} ${branding.appName}. All rights reserved.`}</span>
						</div>
						<nav aria-label={"Page sections"} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
