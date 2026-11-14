"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus } from "@/components/icons";
import { ADDONS_CATALOG, MIN_MAILBOXES, calculateWorkspacePricing, type BillingCycle } from "@/lib/plans/catalog";

const CYCLES: { id: BillingCycle; label: string }[] = [
	{ id: "12m", label: "Yearly" },
	{ id: "6m", label: "6 months" },
	{ id: "3m", label: "3 months" },
];

const PRESETS = [5, 10, 25, 50];

// Public per-user list prices used for the comparison; keep the footnote in sync when these change.
const COMPETITORS = [
	{ name: "Zoho Mail Lite", perUser: 1.25 },
	{ name: "Google Workspace", perUser: 7.2 },
];

const MAX_MAILBOXES = 1000;

export function HomePricing({ signedIn, appName }: { signedIn: boolean; appName: string }) {
	const [cycle, setCycle] = useState<BillingCycle>("12m");
	const [mailboxes, setMailboxes] = useState<number>(MIN_MAILBOXES);

	const pricing = calculateWorkspacePricing(mailboxes, cycle);
	const quarterly = calculateWorkspacePricing(mailboxes, "3m");
	const yearlySavingPct = Math.round((1 - calculateWorkspacePricing(mailboxes, "12m").pricePerMailboxMonthly / quarterly.pricePerMailboxMonthly) * 100);
	const ourYearly = pricing.totalMonthlyEquivalent * 12;
	const storageBooster = ADDONS_CATALOG.find((addon) => addon.id === "addon_mailbox_storage_1gb");

	const included = [
		`${pricing.mailboxes} mailboxes, ${pricing.storageGb} GB storage (1 GB each)`,
		"Up to 5 custom domains",
		"Shared inboxes and aliases",
		"500 emails per mailbox per day",
		"25 MB attachments",
		"Passkeys and two-step verification",
	];

	const ctaHref = signedIn
		? `/admin/plan?cycle=${cycle}&mailboxes=${mailboxes}`
		: `/register?plan=pro&cycle=${cycle}&mailboxes=${mailboxes}`;

	return (
		<div className="mx-auto max-w-6xl px-4 sm:px-6">
			<div className="mx-auto max-w-2xl text-center">
				<h2 id="pricing-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
					One plan. Pay per mailbox.
				</h2>
				<p className="mt-3 text-base text-neutral-600">
					Every feature is included. Pick how many mailboxes you need, starting at {MIN_MAILBOXES}.
				</p>
			</div>

			<div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-16">
				{/* Calculator */}
				<div className="lg:col-span-3">
					<div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-lg bg-neutral-100 p-1">
						{CYCLES.map((option) => (
							<button
								key={option.id}
								type="button"
								role="radio"
								aria-checked={cycle === option.id}
								onClick={() => setCycle(option.id)}
								className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
									cycle === option.id ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
								}`}
							>
								{option.label}
								{option.id === "12m" && yearlySavingPct > 0 && (
									<span className="ml-1.5 text-xs font-semibold text-emerald-600">−{yearlySavingPct}%</span>
								)}
							</button>
						))}
					</div>

					<div className="mt-8 flex items-center justify-between gap-4">
						<label htmlFor="mailbox-count" className="text-sm font-medium text-neutral-700">
							Mailboxes
						</label>
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={mailboxes <= MIN_MAILBOXES}
								onClick={() => setMailboxes((c) => Math.max(MIN_MAILBOXES, c - 1))}
								className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
								aria-label="Fewer mailboxes"
							>
								<Minus className="h-4 w-4" />
							</button>
							<input
								id="mailbox-count"
								type="number"
								inputMode="numeric"
								min={MIN_MAILBOXES}
								max={MAX_MAILBOXES}
								value={mailboxes}
								onChange={(e) => {
									const next = Number.parseInt(e.target.value, 10);
									if (Number.isFinite(next)) setMailboxes(Math.min(MAX_MAILBOXES, next));
								}}
								onBlur={() => setMailboxes((c) => Math.max(MIN_MAILBOXES, c))}
								className="h-9 w-16 rounded-lg border border-neutral-200 text-center font-mono text-base font-semibold [appearance:textfield] focus:border-blue-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
							/>
							<button
								type="button"
								disabled={mailboxes >= MAX_MAILBOXES}
								onClick={() => setMailboxes((c) => Math.min(MAX_MAILBOXES, c + 1))}
								className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
								aria-label="More mailboxes"
							>
								<Plus className="h-4 w-4" />
							</button>
						</div>
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{PRESETS.map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => setMailboxes(preset)}
								className={`rounded-full px-3 py-1 text-xs font-medium transition ${
									mailboxes === preset ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
								}`}
							>
								{preset}
							</button>
						))}
					</div>

					<div className="mt-8 border-t border-neutral-100 pt-6">
						<div className="flex items-baseline gap-2">
							<span className="text-5xl font-bold tracking-tight">${pricing.totalMonthlyEquivalent.toFixed(2)}</span>
							<span className="text-sm text-neutral-500">/ month</span>
						</div>
						<p className="mt-1 text-sm text-neutral-500">
							${pricing.pricePerMailboxMonthly.toFixed(2)} per mailbox · {pricing.billingText}
						</p>
					</div>

					<Link
						href={ctaHref}
						className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
					>
						{signedIn ? "Manage your plan" : `Start with ${pricing.mailboxes} mailboxes`}
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>

				{/* Included + comparison */}
				<div className="border-t border-neutral-200 pt-10 lg:col-span-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
					<p className="text-sm font-semibold">Included</p>
					<ul className="mt-4 space-y-3 text-sm text-neutral-700">
						{included.map((item) => (
							<li key={item} className="flex items-start gap-2.5">
								<Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
								{item}
							</li>
						))}
					</ul>
					{storageBooster && (
						<p className="mt-4 text-xs text-neutral-500">
							Need more space? Add +1 GB to any mailbox for ${storageBooster.priceMonthlyEquivalent.toFixed(2)}/mo.
						</p>
					)}

					<div className="mt-8 border-t border-neutral-200 pt-6">
						<p className="text-sm font-semibold">Per year, {pricing.mailboxes} users</p>
						<dl className="mt-3 space-y-2 text-sm">
							<div className="flex justify-between font-semibold text-blue-700">
								<dt>{appName}</dt>
								<dd>${ourYearly.toFixed(0)}</dd>
							</div>
							{COMPETITORS.map((c) => (
								<div key={c.name} className="flex justify-between text-neutral-500">
									<dt>{c.name}</dt>
									<dd>${(c.perUser * pricing.mailboxes * 12).toFixed(0)}</dd>
								</div>
							))}
						</dl>
						<p className="mt-3 text-[11px] leading-snug text-neutral-400">
							Based on published entry-tier list prices per user. Competitor prices may change.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
