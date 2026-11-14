"use client";

import { useEffect, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { Check, ChevronDown } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth/client";
import type { PlanDefinition, PlanId, WorkspaceStatus } from "@/lib/plans/catalog";
import type { WorkspaceUsage } from "@/lib/plans/usage";
import { SkeletonRows } from "@/components/ui/skeleton";

type SelectOption<T extends string> = { value: T; label: string };

function ShadcnSelect<T extends string>({
	value,
	options,
	disabled,
	ariaLabel,
	onValueChange,
}: {
	value: T;
	options: SelectOption<T>[];
	disabled?: boolean;
	ariaLabel: string;
	onValueChange: (value: T) => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handlePointerDown(e: MouseEvent) {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	const selected = options.find((opt) => opt.value === value);

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				aria-label={ariaLabel}
				aria-haspopup="listbox"
				aria-expanded={open}
				disabled={disabled}
				onClick={() => setOpen((prev) => !prev)}
				className="flex h-9 min-w-32 items-center justify-between gap-2 rounded-full border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-900 shadow-2xs transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span className="truncate">{selected?.label ?? value}</span>
				<ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
			</button>
			{open && (
				<div
					role="listbox"
					aria-label={ariaLabel}
					className="absolute left-0 z-50 mt-1.5 min-w-44 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg sm:left-auto sm:right-0"
				>
					{options.map((opt) => {
						const active = opt.value === value;
						return (
							<button
								key={opt.value}
								type="button"
								role="option"
								aria-selected={active}
								onClick={() => {
									setOpen(false);
									if (opt.value !== value) onValueChange(opt.value);
								}}
								className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
									active
										? "bg-blue-50 font-semibold text-blue-700"
										: "font-medium text-neutral-800 hover:bg-neutral-100"
								}`}
							>
								<span>{opt.label}</span>
								{active && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

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
		try {
			const res = await authFetch("/api/admin/workspaces", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error ?? "Could not update workspace");
			notify.success("Workspace updated");
			await load();
		} catch (err) {
			notify.error(err, "Could not update workspace");
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
				<SkeletonRows count={4} compact />
			) : items.length === 0 ? (
				<p className="text-sm text-neutral-500">No workspaces yet.</p>
			) : (
				<div className="space-y-3">
					{items.map((ws) => (
						<div key={ws.id} className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-5 md:flex-row md:items-center">
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-semibold text-neutral-900">{ws.name}</span>
									<Badge variant={ws.status === "suspended" ? "destructive" : "secondary"} className="rounded-full capitalize">{ws.status}</Badge>
									<span className="text-xs text-neutral-500">{ws.ownerEmail ?? "No owner"}</span>
								</div>
								<p className="text-xs text-neutral-600">
									Domains: {ws.usage.domainsUsed}/{ws.planDetails.maxDomains} &middot; Mailboxes: {ws.usage.mailboxesUsed}/{ws.planDetails.maxMailboxes} &middot; Storage: {formatMb(ws.usage.storageUsedBytes)}/{ws.planDetails.storageLabel} &middot; Sent today: {ws.usage.dailySentCount}/{ws.planDetails.dailySendLimit}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<ShadcnSelect<PlanId>
									ariaLabel="Plan"
									value={ws.plan}
									disabled={busyId === ws.id}
									onValueChange={(plan) => void updateWorkspace({ id: ws.id, plan })}
									options={[
										{ value: "starter", label: "Starter ($5/mo)" },
										{ value: "pro", label: "Pro ($15/mo)" },
										{ value: "business", label: "Business ($39/mo)" },
									]}
								/>
								<ShadcnSelect<WorkspaceStatus>
									ariaLabel="Status"
									value={ws.status}
									disabled={busyId === ws.id}
									onValueChange={(status) => void updateWorkspace({ id: ws.id, status })}
									options={[
										{ value: "trialing", label: "Trialing" },
										{ value: "active", label: "Active" },
										{ value: "suspended", label: "Suspended" },
									]}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-9 rounded-full px-3.5 text-xs"
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

