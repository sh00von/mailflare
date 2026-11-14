"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	ArrowRight,
	BadgeDollarSign,
	DatabaseBackup,
	Globe2,
	ListChecks,
	Settings,
	ShieldCheck,
	Users,
	UsersRound,
} from "@/components/icons";
import { AdminUpdateCard } from "@/components/admin-update-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getPlanDefinition, type PlanId, type WorkspaceStatus } from "@/lib/plans/catalog";

type AdminSection = {
	href: string;
	title: string;
	description: string;
	icon: typeof Globe2;
	permission?: "primary" | "domains" | "users";
};

type WorkspaceOverview = {
	workspace: {
		id: string;
		name: string;
		plan: PlanId;
		status: WorkspaceStatus;
		trialEndsAt: string | null;
	};
	usage: {
		domainsUsed: number;
		mailboxesUsed: number;
		storageUsedBytes: number;
		dailySentCount: number;
	};
};

const sections: AdminSection[] = [
	{
		href: "/admin/domains",
		title: "Domains",
		description: "Connect custom domains and verify MX, SPF, DMARC, and Resend DNS records.",
		icon: Globe2,
		permission: "domains",
	},
	{
		href: "/admin/mailboxes",
		title: "Mailboxes",
		description: "Create and manage team member accounts and mailbox access.",
		icon: Users,
		permission: "users",
	},
	{
		href: "/admin/plan",
		title: "Plan & Usage",
		description: "Review your active plan, trial status, and workspace resource quotas.",
		icon: BadgeDollarSign,
	},
	{
		href: "/admin/workspaces",
		title: "Workspaces",
		description: "Manage all SaaS customer workspaces, plans, statuses, and usage.",
		icon: UsersRound,
		permission: "primary",
	},
	{
		href: "/admin/spam-filter",
		title: "Spam filter",
		description: "Tune spam scoring thresholds and inbound filtering behavior.",
		icon: ShieldCheck,
		permission: "primary",
	},
	{
		href: "/admin/general",
		title: "General",
		description: "Configure outbound provider keys, attachment limits, and instance defaults.",
		icon: Settings,
		permission: "primary",
	},
	{
		href: "/admin/backups",
		title: "Backups",
		description: "Create, download, and restore database and mail backups.",
		icon: DatabaseBackup,
		permission: "primary",
	},
	{
		href: "/admin/activity",
		title: "Activity & Audit",
		description: "Inspect sign-ins, domain changes, and administrative actions.",
		icon: ListChecks,
		permission: "primary",
	},
];

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes / 1024;
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i++;
	}
	return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[i]}`;
}

export default function AdminSettingsPage() {
	const user = useCurrentUser();
	const [overview, setOverview] = useState<WorkspaceOverview | null>(null);

	useEffect(() => {
		let active = true;
		fetch("/api/workspace/plan")
			.then(async (res) => (res.ok ? ((await res.json()) as WorkspaceOverview) : null))
			.then((data) => {
				if (active && data?.workspace && data?.usage) setOverview(data);
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, []);

	function canSee(section: AdminSection): boolean {
		if (!section.permission) return true;
		if (!user) return false;
		if (section.permission === "primary") return user.isPrimaryAdmin;
		if (section.permission === "domains") return user.isPrimaryAdmin || user.canManageDomains;
		return user.isPrimaryAdmin || user.canManageUsers;
	}

	const planDef = overview ? getPlanDefinition(overview.workspace.plan) : null;

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Workspace overview</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Manage your custom domains, team mailboxes, plan quotas, and mail infrastructure.
				</p>
			</div>

			{overview && planDef && (
				<Card className="rounded-3xl border border-neutral-200/80 bg-white p-6">
					<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-lg font-semibold text-neutral-950">{overview.workspace.name}</h2>
								<span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
									{planDef.name} · ${planDef.priceMonthlyUsd}/mo
								</span>
								<span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-700">
									{overview.workspace.status}
								</span>
							</div>
							<p className="mt-1 text-xs text-neutral-500">
								Up to {planDef.maxAttachmentMb} MB per attachment · {planDef.storageLabel} cloud storage
							</p>
						</div>
						<Button asChild variant="outline" size="sm" className="rounded-full">
							<Link href="/plan">
								Manage plan
								<ArrowRight className="h-3.5 w-3.5" />
							</Link>
						</Button>
					</div>
					<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div className="rounded-2xl bg-neutral-50 px-4 py-3">
							<p className="text-xs text-neutral-500">Domains</p>
							<p className="mt-1 text-base font-semibold text-neutral-900">
								{overview.usage.domainsUsed} / {planDef.maxDomains}
							</p>
						</div>
						<div className="rounded-2xl bg-neutral-50 px-4 py-3">
							<p className="text-xs text-neutral-500">Mailboxes</p>
							<p className="mt-1 text-base font-semibold text-neutral-900">
								{overview.usage.mailboxesUsed} / {planDef.maxMailboxes}
							</p>
						</div>
						<div className="rounded-2xl bg-neutral-50 px-4 py-3">
							<p className="text-xs text-neutral-500">Cloud Storage</p>
							<p className="mt-1 text-base font-semibold text-neutral-900">
								{formatBytes(overview.usage.storageUsedBytes)} / {planDef.storageLabel}
							</p>
						</div>
						<div className="rounded-2xl bg-neutral-50 px-4 py-3">
							<p className="text-xs text-neutral-500">Sent today</p>
							<p className="mt-1 text-base font-semibold text-neutral-900">
								{overview.usage.dailySentCount} / {planDef.dailySendLimit.toLocaleString()}
							</p>
						</div>
					</div>
				</Card>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				{sections.filter(canSee).map((section) => {
					const Icon = section.icon;

					return (
						<Link key={section.href} href={section.href}>
							<Card className="h-full rounded-3xl border border-neutral-200/80 bg-white p-6 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
								<CardHeader className="flex-row items-center gap-4 space-y-0 p-0">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
										<Icon className="h-5 w-5" />
									</div>
									<h2 className="text-base font-semibold leading-none text-neutral-950">{section.title}</h2>
								</CardHeader>
								<CardContent className="p-0 pt-3">
									<p className="text-sm leading-6 text-neutral-500">{section.description}</p>
								</CardContent>
							</Card>
						</Link>
					);
				})}
			</div>

			{user?.isPrimaryAdmin && (
				<div className="pt-2">
					<AdminUpdateCard />
				</div>
			)}
		</div>
	);
}
