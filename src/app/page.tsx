import type { Metadata } from "next";
import Link from "next/link";
import {
	Check,
	ChevronDown,
	Clock,
	FolderInput,
	Globe2,
	KeyRound,
	ShieldCheck,
	Users,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getHomeBranding } from "./home-server-utils";
import { HomeAuthProvider } from "./home-auth";
import { HomeHeaderActions } from "./home-header-actions";
import { HomeHeroActions } from "./home-hero-actions";
import { HomeInboxPreview } from "./home-inbox-preview";
import { HomePricing } from "./home-pricing";
import { faqs, landingNavItems } from "./utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: `${branding.appName} — Business email on your own domain`,
		description:
			"Professional email on your own domain from $0.50 per mailbox. Shared team inboxes, guided DNS setup, no ads and no inbox scanning.",
		icons: { icon: branding.hasCustomIcon ? "/api/branding/icon" : "/icon-96.png" },
	};
}

const FEATURES = [
	{
		icon: Globe2,
		title: "Your domain, set up for you",
		body: "Add up to 5 domains. We check MX, SPF, DKIM and DMARC live and tell you exactly what to fix.",
	},
	{
		icon: Users,
		title: "Shared team inboxes",
		body: "Run support@ and sales@ together with Full access, Send as, Send on behalf or Read only roles.",
	},
	{
		icon: Clock,
		title: "An inbox that keeps up",
		body: "Threads, snooze, scheduled send, undo send and follow-up reminders when nobody replies.",
	},
	{
		icon: FolderInput,
		title: "Bring your old mail",
		body: "Import a Google Takeout or mbox archive in the background with folders and threads intact.",
	},
	{
		icon: ShieldCheck,
		title: "Private by default",
		body: "No ads, no inbox scanning, no profiling. Remote images stay blocked until you allow them.",
	},
	{
		icon: KeyRound,
		title: "Secure sign-in",
		body: "Passkeys, authenticator-app two-step verification and recovery codes for every account.",
	},
];

const HERO_POINTS = ["5 custom domains included", "1 GB storage per mailbox", "No ads or inbox scanning"];

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
				calendarEnabled: false,
				driveEnabled: false,
			}
		: null;
	const iconSrc = branding.hasCustomIcon ? "/api/branding/icon" : "/icon-96.png";
	const signedIn = !!initialUser;
	const year = String(new Date().getFullYear());

	return (
		<HomeAuthProvider initialUser={initialUser}>
			<div className="min-h-dvh bg-white text-neutral-900 selection:bg-blue-500/20">
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-blue-600 focus:shadow"
				>
					Skip to content
				</a>

				<header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
					<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
						<div className="flex items-center gap-10">
							<Link href="/" className="flex items-center gap-2.5" aria-label={`${branding.appName} home`}>
								<img src={iconSrc} height={28} width={28} alt="" className="rounded-lg" />
								<span className="text-lg font-semibold tracking-tight">{branding.appName}</span>
							</Link>
							<nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-neutral-600 md:flex">
								{landingNavItems.map((item) => (
									<a key={item.href} href={item.href} className="transition hover:text-neutral-900">
										{item.labelKey}
									</a>
								))}
							</nav>
						</div>
						<div className="flex items-center gap-2">
							<HomeHeaderActions />
						</div>
					</div>
				</header>

				<main id="main">
					{/* Hero */}
					<section className="relative overflow-hidden">
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-linear-to-b from-blue-50/70 to-transparent"
						/>
						<div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
							<p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
								From $0.50 per mailbox / month
							</p>
							<h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
								Business email on your own domain.
							</h1>
							<p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-600 sm:text-lg">
								Give your team <span className="font-medium text-neutral-900">you@yourcompany.com</span> with shared
								inboxes and guided DNS setup, for a fraction of what the big suites charge.
							</p>
							<div className="mt-9">
								<HomeHeroActions />
							</div>
							<ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500">
								{HERO_POINTS.map((point) => (
									<li key={point} className="flex items-center gap-1.5">
										<Check className="h-4 w-4 text-emerald-600" />
										{point}
									</li>
								))}
							</ul>
							<div className="mx-auto mt-16 max-w-5xl">
								<HomeInboxPreview />
							</div>
						</div>
					</section>

					{/* Features */}
					<section
						id="features"
						aria-labelledby="features-title"
						className="scroll-mt-20 border-t border-neutral-100 bg-neutral-50/60 py-20 sm:py-24"
					>
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<div className="max-w-2xl">
								<h2 id="features-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
									Everything a team inbox needs. Nothing it doesn’t.
								</h2>
								<p className="mt-3 text-base text-neutral-600">
									The essentials of Google Workspace and Zoho Mail, without the bundle you never use.
								</p>
							</div>
							<div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
								{FEATURES.map((feature) => (
									<div key={feature.title}>
										<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600">
											<feature.icon className="h-5 w-5" />
										</span>
										<h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
										<p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{feature.body}</p>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* Pricing */}
					<section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 py-20 sm:py-24">
						<HomePricing signedIn={signedIn} appName={branding.appName} />
					</section>

					{/* FAQ */}
					<section
						id="faq"
						aria-labelledby="faq-title"
						className="scroll-mt-20 border-t border-neutral-100 bg-neutral-50/60 py-20 sm:py-24"
					>
						<div className="mx-auto max-w-3xl px-4 sm:px-6">
							<h2 id="faq-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
								Questions, answered
							</h2>
							<div className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
								{faqs.map((faq) => (
									<details key={faq.questionKey} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
										<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium">
											{faq.questionKey}
											<ChevronDown className="h-5 w-5 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
										</summary>
										<p className="mt-3 pr-8 text-sm leading-relaxed text-neutral-600">{faq.answerKey}</p>
									</details>
								))}
							</div>
						</div>
					</section>

					{/* Final CTA */}
					<section aria-labelledby="cta-title" className="py-24 sm:py-28">
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<div className="text-center">
								<h2 id="cta-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
									Your team’s email, live today.
								</h2>
								<p className="mx-auto mt-3 max-w-lg text-base text-neutral-600">
									Add your domain, verify DNS and create mailboxes in a few minutes.
								</p>
								<div className="mt-8">
									<HomeHeroActions />
								</div>
							</div>
						</div>
					</section>
				</main>

				<footer className="border-t border-neutral-200">
					<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:px-6">
						<div className="flex items-center gap-2">
							<img src={iconSrc} height={20} width={20} alt="" className="rounded" />
							<span className="font-medium text-neutral-700">{branding.appName}</span>
							<span>{`© ${year}`}</span>
						</div>
						<nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							{landingNavItems.map((item) => (
								<a key={item.href} href={item.href} className="transition hover:text-neutral-900">
									{item.labelKey}
								</a>
							))}
							{!signedIn && (
								<Link href="/login" className="transition hover:text-neutral-900">
									Sign in
								</Link>
							)}
						</nav>
					</div>
				</footer>
			</div>
		</HomeAuthProvider>
	);
}
