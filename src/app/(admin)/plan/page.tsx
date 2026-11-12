"use client";

import { useEffect, useState } from "react";
import { Check } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authFetch } from "@/lib/auth/client";
import type { PlanDefinition } from "@/lib/plans/catalog";
import type { WorkspaceSummary, WorkspaceUsage } from "@/lib/plans/usage";

type PlanResponse = {
	workspace: WorkspaceSummary;
	usage: WorkspaceUsage;
	plans: PlanDefinition[];
	error?: string;
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function UsageBar({ label, usedLabel, maxLabel, pct }: { label: string; usedLabel: string; maxLabel: string; pct: number }) {
	const clamped = Math.min(100, Math.max(0, Math.round(pct)));
	const tone = clamped >= 95 ? "bg-red-600" : clamped >= 80 ? "bg-amber-500" : "bg-blue-600";
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-neutral-800">{label}</span>
				<span className="text-xs text-neutral-500">
					{usedLabel} / {maxLabel}
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
				<div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${clamped}%` }} />
			</div>
		</div>
	);
}

export default function PlanAndUsagePage() {
	const [data, setData] = useState<PlanResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		authFetch("/api/workspace/plan", { cache: "no-store" })
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

	if (error) {
		return <p role="alert" className="text-sm text-red-600">{error}</p>;
	}

	if (!data) {
		return <div className="text-sm text-neutral-500">Loading plan and usage...</div>;
	}

	const { workspace, usage, plans } = data;
	const limits = workspace.planDetails;

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Plan &amp; Usage</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Track your workspace limits across domains, mailboxes, storage, and daily outbound email.
				</p>
			</div>

			<Card>
				<CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
					<div>
						<div className="flex items-center gap-2.5">
							<h2 className="text-lg font-semibold text-neutral-900">{limits.name} Plan</h2>
							<Badge variant={workspace.status === "suspended" ? "destructive" : "secondary"}>
								{workspace.status === "trialing"
									? workspace.trialExpired
										? "Trial ended"
										: `14-day Trial · ${workspace.daysLeftInTrial ?? 0}d left`
									: workspace.status === "active"
										? "Active"
										: "Suspended"}
							</Badge>
						</div>
						<p className="mt-1 text-sm text-neutral-500">
							${limits.priceMonthlyUsd}/month · {limits.tagline}
						</p>
					</div>
					<p className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
						Online billing &amp; self-serve upgrades coming soon
					</p>
				</CardHeader>
				<CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
					<UsageBar
						label="Custom domains"
						usedLabel={String(usage.domainsUsed)}
						maxLabel={String(limits.maxDomains)}
						pct={(usage.domainsUsed / limits.maxDomains) * 100}
					/>
					<UsageBar
						label="Mailboxes & users"
						usedLabel={String(usage.mailboxesUsed)}
						maxLabel={String(limits.maxMailboxes)}
						pct={(usage.mailboxesUsed / limits.maxMailboxes) * 100}
					/>
					<UsageBar
						label="Workspace storage"
						usedLabel={formatBytes(usage.storageUsedBytes)}
						maxLabel={limits.storageLabel}
						pct={(usage.storageUsedBytes / limits.storageLimitBytes) * 100}
					/>
					<UsageBar
						label="Emails sent today (UTC)"
						usedLabel={String(usage.dailySentCount)}
						maxLabel={String(limits.dailySendLimit)}
						pct={(usage.dailySentCount / limits.dailySendLimit) * 100}
					/>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-3">
				{plans.map((plan) => {
					const current = plan.id === workspace.plan;
					return (
						<Card key={plan.id} className={current ? "border-blue-600 ring-1 ring-blue-600" : ""}>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-base font-semibold text-neutral-900">{plan.name}</h3>
									{current && <Badge>Current</Badge>}
								</div>
								<p className="text-2xl font-bold text-neutral-900">
									${plan.priceMonthlyUsd}
									<span className="text-sm font-normal text-neutral-500">/mo</span>
								</p>
								<p className="text-xs text-neutral-500">{plan.tagline}</p>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-neutral-700">
								<p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {plan.maxDomains} {plan.maxDomains === 1 ? "domain" : "domains"}</p>
								<p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {plan.maxMailboxes} mailboxes</p>
								<p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {plan.storageLabel} storage</p>
								<p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {plan.dailySendLimit.toLocaleString()} emails/day</p>
								<p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {plan.maxAttachmentMb} MB max attachment</p>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

