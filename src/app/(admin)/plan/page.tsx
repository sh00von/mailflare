"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Download, ExternalLink, FileText } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authFetch } from "@/lib/auth/client";
import { PLAN_LIST, type PlanDefinition, type PlanId } from "@/lib/plans/catalog";
import type { WorkspaceSummary, WorkspaceUsage } from "@/lib/plans/usage";
import { Skeleton } from "@/components/ui/skeleton";

type StripeInvoice = {
	id: string;
	number: string | null;
	created: number;
	amount_paid: number;
	currency: string;
	status: string;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
	period_start: number;
	period_end: number;
};

type PlanResponse = {
	workspace: WorkspaceSummary;
	usage: WorkspaceUsage;
	plans: PlanDefinition[];
	billing?: {
		stripeConfigured: boolean;
		hasCustomer: boolean;
		currentPeriodEnd: string | null;
	};
	invoices?: StripeInvoice[];
	error?: string;
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function UsageBar({
	label,
	usedLabel,
	maxLabel,
	pct,
	loading = false,
}: {
	label: string;
	usedLabel?: string;
	maxLabel?: string;
	pct?: number;
	loading?: boolean;
}) {
	const clamped = Math.min(100, Math.max(0, Math.round(pct ?? 0)));
	const tone = clamped >= 95 ? "bg-red-600" : clamped >= 80 ? "bg-amber-500" : "bg-blue-600";
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-neutral-800">{label}</span>
				{loading ? (
					<Skeleton className="h-3 w-14" />
				) : (
					<span className="text-xs text-neutral-500">
						{usedLabel} / {maxLabel}
					</span>
				)}
			</div>
			{loading ? (
				<Skeleton className="h-2 w-full rounded-full" />
			) : (
				<div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
					<div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${clamped}%` }} />
				</div>
			)}
		</div>
	);
}

export default function PlanAndUsagePage() {
	const [data, setData] = useState<PlanResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busyPlan, setBusyPlan] = useState<PlanId | "portal" | null>(null);
	const [billingNotice, setBillingNotice] = useState<string | null>(null);

	useEffect(() => {
		let sessionId: string | null = null;
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			const status = params.get("billing");
			sessionId = params.get("session_id");
			if (status === "success") setBillingNotice("Payment confirmed! Your subscription is now active.");
			else if (status === "canceled") setBillingNotice("Checkout was canceled. No changes were made.");
		}

		let cancelled = false;
		const fetchUrl = sessionId
			? `/api/workspace/plan?session_id=${encodeURIComponent(sessionId)}`
			: "/api/workspace/plan";

		authFetch(fetchUrl, { cache: "no-store" })
			.then(async (res) => ({ res, json: (await res.json()) as PlanResponse }))
			.then(({ res, json }) => {
				if (cancelled) return;
				if (!res.ok) throw new Error(json.error ?? "Failed to load plan details");
				setData(json);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load plan details");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const workspace = data?.workspace;
	const usage = data?.usage;
	const limits = workspace?.planDetails;
	const plans = data?.plans ?? PLAN_LIST;
	const billing = data?.billing;
	const invoices = data?.invoices ?? [];
	const stripeReady = billing?.stripeConfigured ?? false;
	const loading = !data && !error;
	const isActive = workspace?.status === "active";

	async function startCheckout(planId: PlanId) {
		setBusyPlan(planId);
		setError("");
		try {
			const res = await authFetch("/api/billing/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan: planId }),
			});
			const payload = (await res.json()) as { url?: string; error?: string };
			if (!res.ok || !payload.url) {
				setError(payload.error || "Failed to start Stripe checkout");
				return;
			}
			window.location.assign(payload.url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to start Stripe checkout");
		} finally {
			setBusyPlan(null);
		}
	}

	async function openBillingPortal() {
		setBusyPlan("portal");
		setError("");
		try {
			const res = await authFetch("/api/billing/portal", { method: "POST" });
			const payload = (await res.json()) as { url?: string; error?: string };
			if (!res.ok || !payload.url) {
				setError(payload.error || "Failed to open billing portal");
				return;
			}
			window.location.assign(payload.url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to open billing portal");
		} finally {
			setBusyPlan(null);
		}
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Plan &amp; Usage</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Track your workspace limits across domains, mailboxes, storage, and outbound email.
				</p>
			</div>

			{billingNotice && (
				<p
					role="status"
					className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900"
				>
					{billingNotice}
				</p>
			)}

			{/* Current Plan & Usage Summary Card */}
			<Card className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
				<CardHeader className="flex-col items-start justify-between gap-4 border-b border-neutral-100 p-0 pb-5 sm:flex-row sm:items-center">
					<div className="min-w-0">
						{workspace && limits ? (
							<>
								<div className="flex flex-wrap items-center gap-2.5">
									<h2 className="text-lg font-semibold text-neutral-950">
										{isActive ? `${limits.name} Plan` : "Free Tier (Setup Mode)"}
									</h2>
									<Badge
										variant="outline"
										className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
											isActive
												? "border-emerald-200 bg-emerald-50 text-emerald-700"
												: "border-blue-200 bg-blue-50 text-blue-700"
										}`}
									>
										{isActive ? "Active Subscription" : "Free Plan"}
									</Badge>
								</div>
								<p className="mt-1 text-sm text-neutral-500">
									{isActive ? (
										<>
											${limits.priceMonthlyUsd}/month · {limits.tagline}
											{billing?.currentPeriodEnd
												? ` · Renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
												: ""}
										</>
									) : (
										"Free limits apply · Upgrade to an active plan below to unlock outbound sending, larger storage & more mailboxes."
									)}
								</p>
							</>
						) : error ? (
							<p role="alert" className="text-sm text-red-600">{error}</p>
						) : (
							<div role="status" aria-label="Loading plan" className="space-y-2.5">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-3.5 w-56" />
							</div>
						)}
					</div>
					{stripeReady && billing?.hasCustomer ? (
						<Button
							type="button"
							variant="outline"
							className="shrink-0 rounded-full"
							disabled={busyPlan !== null}
							onClick={() => void openBillingPortal()}
						>
							{busyPlan === "portal" ? "Opening portal..." : "Manage Billing & Invoices"}
						</Button>
					) : !loading && !stripeReady ? (
						<p className="shrink-0 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-medium text-neutral-600">
							Set STRIPE_SECRET_KEY to enable online billing
						</p>
					) : null}
				</CardHeader>
				<CardContent className="grid gap-5 p-0 pt-6 sm:grid-cols-2">
					<UsageBar
						label="Custom domains"
						loading={loading}
						usedLabel={usage && String(usage.domainsUsed)}
						maxLabel={isActive && limits ? String(limits.maxDomains) : "1"}
						pct={
							usage
								? (usage.domainsUsed / (isActive && limits ? limits.maxDomains : 1)) * 100
								: 0
						}
					/>
					<UsageBar
						label="Mailboxes & users"
						loading={loading}
						usedLabel={usage && String(usage.mailboxesUsed)}
						maxLabel={isActive && limits ? String(limits.maxMailboxes) : "1"}
						pct={
							usage
								? (usage.mailboxesUsed / (isActive && limits ? limits.maxMailboxes : 1)) * 100
								: 0
						}
					/>
					<UsageBar
						label="Workspace storage"
						loading={loading}
						usedLabel={usage && formatBytes(usage.storageUsedBytes)}
						maxLabel={isActive && limits ? limits.storageLabel : "1 GB"}
						pct={
							usage
								? (usage.storageUsedBytes / (isActive && limits ? limits.storageLimitBytes : 1024 ** 3)) * 100
								: 0
						}
					/>
					<UsageBar
						label="Emails sent today (UTC)"
						loading={loading}
						usedLabel={usage && String(usage.dailySentCount)}
						maxLabel={isActive && limits ? String(limits.dailySendLimit) : "0 (Upgrade to send)"}
						pct={
							isActive && usage && limits
								? (usage.dailySentCount / limits.dailySendLimit) * 100
								: 0
						}
					/>
				</CardContent>
			</Card>

			{/* Pricing Plans Selection */}
			<div>
				<div className="mb-4">
					<h2 className="text-xl font-semibold text-neutral-900">Select a Subscription Plan</h2>
					<p className="text-sm text-neutral-500">
						Choose the plan that fits your volume. Upgrade, downgrade, or cancel anytime.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					{plans.map((plan) => {
						const isCurrentActive = isActive && plan.id === workspace?.plan;
						const isSelectedBeforePay = !isActive && plan.id === workspace?.plan;

						return (
							<Card
								key={plan.id}
								className={`flex flex-col justify-between rounded-3xl bg-white p-6 shadow-sm transition-all ${
									isCurrentActive
										? "border-2 border-emerald-500 ring-2 ring-emerald-500/20"
										: isSelectedBeforePay || plan.highlighted
											? "border-2 border-blue-600 ring-2 ring-blue-600/10"
											: "border border-neutral-200/80"
								}`}
							>
								<div>
									<CardHeader className="space-y-2 p-0 pb-4">
										<div className="flex items-center justify-between gap-2">
											<h3 className="text-base font-semibold text-neutral-950">{plan.name}</h3>
											{isCurrentActive ? (
												<span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
													Current Plan
												</span>
											) : isSelectedBeforePay ? (
												<span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
													Selected
												</span>
											) : plan.highlighted ? (
												<span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
													Popular
												</span>
											) : null}
										</div>
										<p className="text-3xl font-semibold tracking-tight text-neutral-950">
											${plan.priceMonthlyUsd}
											<span className="text-sm font-normal text-neutral-500">/mo</span>
										</p>
										<p className="text-xs text-neutral-500">{plan.tagline}</p>
									</CardHeader>
									<CardContent className="space-y-2.5 border-t border-neutral-100 p-0 pt-4 text-sm text-neutral-700">
										<p className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> {plan.maxDomains} {plan.maxDomains === 1 ? "domain" : "domains"}</p>
										<p className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> {plan.maxMailboxes} mailboxes</p>
										<p className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> {plan.storageLabel} storage</p>
										<p className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> {plan.dailySendLimit.toLocaleString()} emails/day</p>
										<p className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> {plan.maxAttachmentMb} MB max attachment</p>
									</CardContent>
								</div>

								<div className="pt-6">
									{stripeReady && (
										<Button
											type="button"
											variant={isCurrentActive ? "outline" : "default"}
											className="w-full rounded-full font-medium"
											disabled={busyPlan !== null || isCurrentActive}
											onClick={() => void startCheckout(plan.id)}
										>
											{busyPlan === plan.id ? (
												"Redirecting to Stripe..."
											) : isCurrentActive ? (
												"Current active plan"
											) : isActive ? (
												`Switch to ${plan.name}`
											) : (
												`Activate ${plan.name}`
											)}
											{!isCurrentActive && <ArrowRight className="ml-1.5 h-4 w-4" />}
										</Button>
									)}
								</div>
							</Card>
						);
					})}
				</div>
			</div>

			{/* Payment History & Invoices Section */}
			<Card className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
				<CardHeader className="p-0 pb-4">
					<div className="flex items-center gap-2">
						<FileText className="h-5 w-5 text-neutral-700" />
						<h2 className="text-lg font-semibold text-neutral-950">Payment History &amp; Invoices</h2>
					</div>
					<p className="text-sm text-neutral-500">
						View past subscription invoices and download official PDF receipts.
					</p>
				</CardHeader>
				<CardContent className="p-0 pt-2">
					{loading ? (
						<div className="space-y-3 py-4">
							<Skeleton className="h-10 w-full rounded-xl" />
							<Skeleton className="h-10 w-full rounded-xl" />
						</div>
					) : invoices.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
										<th className="py-3 pr-4">Date</th>
										<th className="py-3 px-4">Invoice #</th>
										<th className="py-3 px-4">Amount</th>
										<th className="py-3 px-4">Status</th>
										<th className="py-3 pl-4 text-right">Receipt / PDF</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-100">
									{invoices.map((inv) => (
										<tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
											<td className="py-3.5 pr-4 font-medium text-neutral-800">
												{new Date(inv.created * 1000).toLocaleDateString("en-US", {
													year: "numeric",
													month: "short",
													day: "numeric",
												})}
											</td>
											<td className="py-3.5 px-4 text-neutral-500 font-mono text-xs">
												{inv.number || inv.id}
											</td>
											<td className="py-3.5 px-4 font-medium text-neutral-900">
												${(inv.amount_paid / 100).toFixed(2)}{" "}
												<span className="text-xs text-neutral-400 uppercase">{inv.currency}</span>
											</td>
											<td className="py-3.5 px-4">
												<Badge
													variant="outline"
													className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
												>
													{inv.status === "paid" ? "Paid" : inv.status}
												</Badge>
											</td>
											<td className="py-3.5 pl-4 text-right">
												<div className="flex items-center justify-end gap-2">
													{inv.invoice_pdf && (
														<a
															href={inv.invoice_pdf}
															target="_blank"
															rel="noopener noreferrer"
															className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 shadow-xs transition-colors"
														>
															<Download className="h-3.5 w-3.5" />
															Download PDF
														</a>
													)}
													{inv.hosted_invoice_url && (
														<a
															href={inv.hosted_invoice_url}
															target="_blank"
															rel="noopener noreferrer"
															className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
														>
															<ExternalLink className="h-3.5 w-3.5" />
															View
														</a>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
							<p className="text-sm font-medium text-neutral-600">No payment invoices yet</p>
							<p className="mt-1 text-xs text-neutral-400">
								Invoices and downloadable PDF receipts will appear here automatically when a payment is processed.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
