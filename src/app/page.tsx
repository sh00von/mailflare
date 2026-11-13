import type { Metadata } from "next";
import Link from "next/link";
import {
	Bell,
	Check,
	ChevronDown,
	Clock,
	FolderInput,
	Globe2,
	HardDrive,
	ShieldCheck,
	Smartphone,
	Users,
} from "@/components/icons";
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

/*
 * The homepage is always light, in the style of Google Workspace. The app's dark theme remaps the
 * Tailwind palette (neutral, white, blue…) under `.dark`, so this page uses fixed hex colours only.
 */

const PRODUCT_TILES = [
	{ icon: Globe2, tone: "bg-blue-50 text-blue-600", title: "Your own domain", body: "Connect your company domain with guided MX, SPF and DMARC checks, then hand out addresses in seconds." },
	{ icon: Users, tone: "bg-green-50 text-green-700", title: "Shared team inboxes", body: "Let teammates work support@ or sales@ together, with read-only, send-as or full access per person." },
	{ icon: ShieldCheck, tone: "bg-red-50 text-red-600", title: "Spam and security", body: "Layered spam scoring, two-step sign-in and audit logs keep your mail and your team safe." },
	{ icon: HardDrive, tone: "bg-amber-50 text-amber-700", title: "Cloud storage", body: "Every workspace gets generous attachment storage with clear, predictable limits." },
	{ icon: Clock, tone: "bg-purple-50 text-purple-600", title: "Schedule and snooze", body: "Threaded conversations, scheduled sends, undo send and snooze keep the inbox under control." },
	{ icon: FolderInput, tone: "bg-cyan-50 text-cyan-700", title: "Easy migration", body: "Import from a Gmail export in the background, folders and threads intact." },
];

const HIGHLIGHTS = [
	{ icon: Bell, title: "Instant push notifications", body: "Know the moment an important message arrives." },
	{ icon: Smartphone, title: "Works on every device", body: "Install the web app on your phone or desktop for an ultra-fast, modern inbox." },
	{ icon: ShieldCheck, title: "Private by default", body: "Remote images stay blocked until you choose to load them." },
];

const GOOGLE_DOTS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"];

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
			<div className="min-h-dvh bg-white text-neutral-900">
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-blue-600 focus:shadow"
				>
					Skip to content
				</a>

				<header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
					<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
						<div className="flex items-center gap-8">
							<Link href="/" className="flex items-center gap-2.5" aria-label={`${branding.appName} home`}>
								<img src={iconSrc} height={28} width={28} alt="" />
								<span className="text-[20px] font-medium tracking-tight text-neutral-500">{branding.appName}</span>
							</Link>
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
							className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-radial-[60%_60%_at_50%_0%] from-blue-50 to-transparent"
						/>
						<div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
							<div className="mx-auto mb-6 flex w-fit items-center gap-1.5" aria-hidden="true">
								{GOOGLE_DOTS.map((color) => (
									<span key={color} className={`h-2 w-2 rounded-full ${color}`} />
								))}
							</div>
							<h1 className="mx-auto max-w-4xl text-balance text-[40px] font-normal leading-[1.1] tracking-[-0.02em] text-neutral-900 sm:text-[56px] lg:text-[64px]">
								Professional email for your business, <span className="text-blue-600">made simple</span>
							</h1>
							<p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-neutral-500">
								Custom email at <span className="font-medium text-neutral-900">you@yourcompany.com</span>, shared team inboxes and
								built-in security. Set up your whole team in minutes.
							</p>
							<div className="mt-10">
								<HomeHeroActions />
							</div>
							<p className="mt-5 text-sm text-neutral-500">Fast setup · Cloud storage · Built-in security</p>

							<div className="relative mx-auto mt-14 max-w-5xl">
								<div
									aria-hidden="true"
									className="absolute -inset-x-6 -bottom-6 top-10 -z-10 rounded-[32px] bg-linear-135 from-blue-50 via-green-50 to-amber-50 opacity-70 blur-2xl"
								/>
								<HomeInboxPreview />
							</div>
						</div>
					</section>

					{/* Products / features */}
					<section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-20 sm:py-24">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
							<div className="mx-auto max-w-2xl text-center">
								<h2 id="features-title" className="text-[32px] font-normal leading-tight tracking-[-0.01em] text-neutral-900 sm:text-[44px]">
									Everything your team needs to stay connected
								</h2>
								<p className="mt-4 text-base leading-7 text-neutral-500 sm:text-lg">
									One secure workspace for your company email, with nothing extra to install.
								</p>
							</div>
							<div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{PRODUCT_TILES.map((tile) => (
									<div
										key={tile.title}
										className="group rounded-3xl border border-neutral-200 bg-white p-8 transition hover:border-transparent hover:shadow-md"
									>
										<span
											className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tile.tone}`}
										>
											<tile.icon className="h-6 w-6" />
										</span>
										<h3 className="mt-6 text-xl font-medium text-neutral-900">{tile.title}</h3>
										<p className="mt-2 text-[15px] leading-7 text-neutral-500">{tile.body}</p>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* Highlights band */}
					<section aria-label="Highlights" className="bg-neutral-50 py-20">
						<div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
							{HIGHLIGHTS.map((item) => (
								<div key={item.title} className="text-center md:text-left">
									<span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm md:mx-0">
										<item.icon className="h-5 w-5" />
									</span>
									<h3 className="mt-5 text-lg font-medium text-neutral-900">{item.title}</h3>
									<p className="mt-2 text-[15px] leading-7 text-neutral-500">{item.body}</p>
								</div>
							))}
						</div>
					</section>

					{/* Pricing */}
					<section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 py-20 sm:py-24">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
							<div className="mx-auto max-w-2xl text-center">
								<h2 id="pricing-title" className="text-[32px] font-normal leading-tight tracking-[-0.01em] text-neutral-900 sm:text-[44px]">
									Choose the plan that’s right for you
								</h2>
								<p className="mt-4 text-base leading-7 text-neutral-500 sm:text-lg">
									Every plan includes cloud storage and guided domain setup.
								</p>
							</div>

							<div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
								{PLAN_LIST.map((plan) => {
									const featured = !!plan.highlighted;
									const bullets = [
										`${plan.maxDomains} ${plan.maxDomains === 1 ? "custom domain" : "custom domains"}`,
										`Up to ${plan.maxMailboxes} team mailboxes`,
										`${plan.storageLabel} cloud storage`,
										`${plan.dailySendLimit.toLocaleString("en-US")} emails a day`,
										`Attachments up to ${plan.maxAttachmentMb} MB`,
									];
									return (
										<div
											key={plan.id}
											className={`relative flex flex-col rounded-3xl bg-white p-8 ${
												featured
													? "border-2 border-blue-600 shadow-lg"
													: "border border-neutral-300"
											}`}
										>
											{featured && (
												<span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-medium text-white">
													Most popular
												</span>
											)}
											<h3 className="text-2xl font-normal text-neutral-900">{plan.name}</h3>
											<p className="mt-1.5 min-h-10 text-sm leading-5 text-neutral-500">{plan.tagline}</p>
											<div className="mt-6 flex items-baseline gap-1.5">
												<span className="text-[44px] font-normal leading-none tracking-tight text-neutral-900">${plan.priceMonthlyUsd}</span>
												<span className="text-sm text-neutral-500">USD / month</span>
											</div>
											<Link
												href={signedIn ? "/plan" : `/register?plan=${plan.id}`}
												className={`mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition ${
													featured
														? "bg-blue-600 text-white hover:bg-blue-700"
														: "border border-neutral-300 text-blue-600 hover:border-blue-100 hover:bg-blue-50"
												}`}
											>
												{signedIn ? "Manage plan" : "Get started"}
											</Link>
											<ul className="mt-8 space-y-3.5 border-t border-neutral-200 pt-8 text-[15px] text-neutral-700">
												{bullets.map((item) => (
													<li key={item} className="flex items-start gap-3">
														<Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
														<span>{item}</span>
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						</div>
					</section>

					{/* FAQ */}
					<section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-neutral-50 py-20 sm:py-24">
						<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
							<h2 id="faq-title" className="text-center text-[32px] font-normal leading-tight tracking-[-0.01em] text-neutral-900 sm:text-[40px]">
								Frequently asked questions
							</h2>
							<div className="mt-12 divide-y divide-neutral-300 border-y border-neutral-300">
								{faqs.map((faq) => (
									<details key={faq.questionKey} className="group [&_summary::-webkit-details-marker]:hidden">
										<summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-medium text-neutral-900 sm:text-lg">
											{faq.questionKey}
											<ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<p className="-mt-1 pb-5 pr-10 text-[15px] leading-7 text-neutral-500">{faq.answerKey}</p>
									</details>
								))}
							</div>
						</div>
					</section>

					{/* Final CTA */}
					<section aria-labelledby="cta-title" className="py-20 sm:py-24">
						<div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
							<h2 id="cta-title" className="text-balance text-[32px] font-normal leading-tight tracking-[-0.01em] text-neutral-900 sm:text-[44px]">
								Get started with {branding.appName} today
							</h2>
							<p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-500 sm:text-lg">
								Launch team mailboxes on your own domain in minutes. Try it free for 14 days.
							</p>
							<div className="mt-10">
								<HomeHeroActions />
							</div>
						</div>
					</section>
				</main>

				<footer className="border-t border-neutral-300 bg-white">
					<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:px-6 lg:px-8">
						<div className="flex items-center gap-2.5">
							<img src={iconSrc} height={20} width={20} alt="" />
							<span>{`© ${year} ${branding.appName}`}</span>
						</div>
						<nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
							{landingNavItems.map((item) => (
								<a key={item.href} href={item.href} className="transition hover:text-neutral-900">
									{item.labelKey}
								</a>
							))}
							{!signedIn && (
								<>
									<Link href="/login" className="transition hover:text-neutral-900">
										Sign in
									</Link>
									<Link href="/register" className="transition hover:text-neutral-900">
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
