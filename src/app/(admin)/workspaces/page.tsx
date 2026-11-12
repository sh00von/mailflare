"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { authFetch } from "@/lib/auth/client";
import type { PlanDefinition, PlanId, WorkspaceStatus } from "@/lib/plans/catalog";
import type { WorkspaceUsage } from "@/lib/plans/usage";

type AdminWorkspaceItem = {
	id: string;
	name: string;
	ownerEmail: string | null;
	ownerName: string | null;
	plan: PlanId;
	planDetails: PlanDefinition;
	status: WorkspaceStatus;
	trialEndsAt: string | null;
	createdAt: string;
	usage: WorkspaceUsage;
};

function formatMb(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminWorkspacesPage() {
	const [items, setItems] = useState<AdminWorkspaceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		setLoading(true);
		try {
			const res = await authFetch("/api/admin/workspaces", { cache: "no-store" });
			const json = (await res.json()) as { workspaces?: AdminWorkspaceItem[]; error?: string };
			if (!res.ok) throw new Error(json.error ?? "Failed to load workspaces");
			setItems(json.workspaces ?? []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load workspaces");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, []);

	async function updateWorkspace(payload: { id: string; plan?: PlanId; status?: WorkspaceStatus; extendTrialDays?: number }) {
		setBusyId(payload.id);
		setError(null);
		try {
			const res = await authFetch("/api/admin/workspaces", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error ?? "Could not update workspace");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not update workspace");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Customer Workspaces</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Manage SaaS plans, trial windows, usage, and workspace status across all customers.
				</p>
			</div>

			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}

			{loading ? (
				<p className="text-sm text-neutral-500">Loading workspaces...</p>
			) : items.length === 0 ? (
				<p className="text-sm text-neutral-500">No workspaces yet.</p>
			) : (
				<div className="space-y-3">
					{items.map((ws) => (
						<div key={ws.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 md:flex-row md:items-center">
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-semibold text-neutral-900">{ws.name}</span>
									<Badge variant={ws.status === "suspended" ? "destructive" : "secondary"}>{ws.status}</Badge>
									<span className="text-xs text-neutral-500">{ws.ownerEmail ?? "No owner"}</span>
								</div>
								<p className="text-xs text-neutral-600">
									Domains: {ws.usage.domainsUsed}/{ws.planDetails.maxDomains} &middot; Mailboxes: {ws.usage.mailboxesUsed}/{ws.planDetails.maxMailboxes} &middot; Storage: {formatMb(ws.usage.storageUsedBytes)}/{ws.planDetails.storageLabel} &middot; Sent today: {ws.usage.dailySentCount}/{ws.planDetails.dailySendLimit}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Select
									aria-label="Plan"
									value={ws.plan}
									disabled={busyId === ws.id}
									onChange={(e) => void updateWorkspace({ id: ws.id, plan: e.target.value as PlanId })}
									containerClassName="h-9 bg-white px-0"
									className="px-2.5 text-xs"
								>
									<option value="starter">Starter ($5/mo)</option>
									<option value="pro">Pro ($15/mo)</option>
									<option value="business">Business ($39/mo)</option>
								</Select>
								<Select
									aria-label="Status"
									value={ws.status}
									disabled={busyId === ws.id}
									onChange={(e) => void updateWorkspace({ id: ws.id, status: e.target.value as WorkspaceStatus })}
									containerClassName="h-9 bg-white px-0"
									className="px-2.5 text-xs"
								>
									<option value="trialing">Trialing</option>
									<option value="active">Active</option>
									<option value="suspended">Suspended</option>
								</Select>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={busyId === ws.id}
									onClick={() => void updateWorkspace({ id: ws.id, extendTrialDays: 14 })}
								>
									+14d trial
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

