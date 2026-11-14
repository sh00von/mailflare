"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "@/components/icons";
import { PLAN_LIST, calculatePlanPricing, type BillingCycle } from "@/lib/plans/catalog";

export function HomePricing({ signedIn, appName }: { signedIn: boolean; appName: string }) {
	const [cycle, setCycle] = useState<BillingCycle>("yearly");

	return (
		<div className="mx-auto max-w-7xl px-4 sm:px-6">
			{/* Section Header */}
			<div className="mx-auto max-w-3xl text-center space-y-4">
				<div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700">
					<Sparkles className="h-3.5 w-3.5" />
					<span>14-Day Free Pro Trial · No Credit Card Required</span>
				</div>
				<h2 id="pricing-title" className="text-3xl font-extrabold tracking-tight sm:text-5xl text-neutral-900">
					Simple, Cost-Effective Pricing.
				</h2>
				<p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
					Connect your own domains and host professional business email for a fraction of the cost of Google Workspace or Microsoft 365.
				</p>

				{/* Billing Cycle Toggle */}
				<div className="pt-2 inline-flex items-center rounded-2xl border border-neutral-200 bg-neutral-100 p-1">
					<button
						type="button"
						onClick={() => setCycle("monthly")}
						className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
							cycle === "monthly"
								? "bg-white text-neutral-900 shadow-xs"
								: "text-neutral-600 hover:text-neutral-900"
						}`}
					>
						Billed Monthly
					</button>
					<button
						type="button"
						onClick={() => setCycle("yearly")}
						className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
							cycle === "yearly"
								? "bg-white text-neutral-900 shadow-xs"
								: "text-neutral-600 hover:text-neutral-900"
						}`}
					>
						Billed Yearly
						<span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
							2 Months Free
						</span>
					</button>
				</div>
			</div>

			{/* 4-Tier Plan Grid */}
			<div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{PLAN_LIST.map((plan) => {
					const pricing = calculatePlanPricing(plan.id, cycle);
					const isHighlighted = plan.highlighted;
					const ctaHref = signedIn
						? `/admin/plan?plan=${plan.id}&cycle=${cycle}`
						: `/register?plan=${plan.id}&cycle=${cycle}`;

					return (
						<div
							key={plan.id}
							className={`relative flex flex-col justify-between rounded-3xl border bg-white p-7 transition-all duration-200 ${
								isHighlighted
									? "border-blue-600 shadow-xl ring-2 ring-blue-600/20"
									: "border-neutral-200 shadow-xs hover:border-neutral-300 hover:shadow-md"
							}`}
						>
							{isHighlighted && (
								<span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-bold text-white shadow-xs">
									Most Popular
								</span>
							)}

							<div className="space-y-5">
								<div>
									<h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
									<p className="mt-1 text-xs text-neutral-500 min-h-[36px]">{plan.tagline}</p>
								</div>

								<div className="border-y border-neutral-100 py-4">
									<div className="flex items-baseline gap-1">
										<span className="text-4xl font-black text-neutral-900">
											{plan.id === "free" ? "$0" : `$${pricing.monthlyEquivalent.toFixed(2)}`}
										</span>
										<span className="text-sm font-medium text-neutral-500">/ month</span>
									</div>
									<p className="text-xs text-neutral-400 mt-1 font-medium">
										{pricing.billingText}
									</p>
								</div>

								<ul className="space-y-3 text-xs text-neutral-600">
									{plan.features.map((feature, idx) => (
										<li key={idx} className="flex items-start gap-2.5">
											<Check className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
											<span className="leading-tight">{feature}</span>
										</li>
									))}
								</ul>
							</div>

							<div className="pt-8">
								<Link
									href={ctaHref}
									className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-xs font-semibold transition cursor-pointer ${
										isHighlighted
											? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
											: plan.id === "free"
												? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
												: "bg-neutral-900 text-white hover:bg-neutral-800"
									}`}
								>
									{plan.id === "free"
										? "Start Free Forever"
										: isHighlighted
											? "Start 14-Day Free Pro Trial"
											: `Get ${plan.name}`}
									<ArrowRight className="h-3.5 w-3.5" />
								</Link>
							</div>
						</div>
					);
				})}
			</div>

			{/* Cost Comparison Bar */}
			<div className="mt-16 rounded-3xl border border-neutral-200/80 bg-neutral-50/80 p-6 sm:p-8 text-center max-w-4xl mx-auto space-y-3">
				<h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
					Why {appName} is 80%+ More Affordable
				</h3>
				<p className="text-sm text-neutral-600 max-w-2xl mx-auto">
					Legacy providers charge <strong className="text-neutral-900">$7.20 to $18.00 per user every month</strong>. With {appName}, a 5-person team pays just <strong className="text-blue-600">$4.99/mo total</strong> for high-deliverability custom email on your own domain.
				</p>
				<div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 font-medium">
					<span>✓ Zero per-user extortion</span>
					<span>✓ SPF, DKIM &amp; DMARC compliance</span>
					<span>✓ 100% private &amp; open edge architecture</span>
				</div>
			</div>
		</div>
	);
}
