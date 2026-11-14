"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { authFetch } from "@/lib/auth/client";
import { HardDrive, Mail, Paperclip, Sparkles, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";

type StorageStats = {
	messageCount: number;
	attachmentCount: number;
	messagesSizeBytes: number;
	attachmentsSizeBytes: number;
	totalSizeBytes: number;
	quotaBytes: number;
	usagePercentage: number;
	formatted: {
		total: string;
		messages: string;
		attachments: string;
		quota: string;
	};
};

export function MailboxStorageSettings() {
	const { selectedMailbox, isLoading } = useSelectedMailbox();
	const [stats, setStats] = useState<StorageStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	async function fetchStats(mailboxId: string) {
		setLoading(true);
		setError(null);
		try {
			const res = await authFetch(`/api/mailboxes/${mailboxId}/storage`);
			if (!res.ok) throw new Error("Could not load mailbox storage data");
			const data = (await res.json()) as StorageStats;
			setStats(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load storage info");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (selectedMailbox?.id) {
			void fetchStats(selectedMailbox.id);
		}
	}, [selectedMailbox?.id]);

	if (isLoading || (loading && !stats)) {
		return (
			<div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-500">
				<RefreshCw className="mx-auto h-5 w-5 animate-spin text-neutral-400 mb-2" />
				Calculating mailbox storage usage...
			</div>
		);
	}

	if (!selectedMailbox) {
		return (
			<div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-500">
				Select a mailbox to view its storage breakdown.
			</div>
		);
	}

	const address = `${selectedMailbox.localPart}@${selectedMailbox.hostname}`;
	const pct = stats?.usagePercentage ?? 0;
	const barColor = pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-blue-600";

	return (
		<div className="space-y-6">
			<section className="space-y-4 rounded-3xl bg-white p-6 shadow-xs border border-neutral-100">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold text-neutral-900">{`Storage for ${address}`}</h2>
						<p className="text-xs text-neutral-500 mt-0.5">
							{stats?.formatted.total} of {stats?.formatted.quota} used ({pct}%)
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => selectedMailbox.id && fetchStats(selectedMailbox.id)}
						disabled={loading}
						className="gap-2"
					>
						<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>

				{/* Storage Progress Bar */}
				<div className="space-y-2 pt-2">
					<div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
						<div
							className={`h-full transition-all duration-500 ${barColor}`}
							style={{ width: `${Math.max(pct, 2)}%` }}
						/>
					</div>
					<div className="flex justify-between text-xs text-neutral-400">
						<span>0 GB</span>
						<span>500 MB</span>
						<span>{stats?.formatted.quota}</span>
					</div>
				</div>

				{/* Storage Breakdown Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
					<div className="flex items-center gap-3.5 rounded-2xl bg-neutral-50/70 p-4 border border-neutral-100">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/60 text-blue-600">
							<Paperclip className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-medium text-neutral-500">Attachments</p>
							<p className="text-sm font-semibold text-neutral-900">
								{stats?.formatted.attachments}{" "}
								<span className="font-normal text-xs text-neutral-400">
									({stats?.attachmentCount} files)
								</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3.5 rounded-2xl bg-neutral-50/70 p-4 border border-neutral-100">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100/60 text-indigo-600">
							<Mail className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-medium text-neutral-500">Messages & Threads</p>
							<p className="text-sm font-semibold text-neutral-900">
								{stats?.formatted.messages}{" "}
								<span className="font-normal text-xs text-neutral-400">
									({stats?.messageCount} emails)
								</span>
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Upgrade / Booster Card */}
			<section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-6">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
						<Sparkles className="h-5 w-5" />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-neutral-900">Need more space for this inbox?</h3>
						<p className="text-xs text-neutral-600 mt-0.5">
							Add a dedicated +1 GB storage booster directly to {address} for just $0.25/mo without upgrading your whole plan.
						</p>
					</div>
				</div>
				<Link href="/admin/plan" className="shrink-0">
					<Button className="rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white">
						Add +1 GB Booster
					</Button>
				</Link>
			</section>
		</div>
	);
}
