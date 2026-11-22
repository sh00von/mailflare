"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SuppressionEntry {
	id: string;
	email: string;
	reason: "hard_bounce" | "soft_bounce" | "unsubscribe" | "complaint" | "manual";
	status: "active" | "cleared";
	bounceCode?: string | null;
	bounceCount: number;
	details?: string | null;
	createdAt: string;
	updatedAt: string;
}

export default function SuppressionSettingsPage() {
	const [entries, setEntries] = useState<SuppressionEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [unblockingId, setUnblockingId] = useState<string | null>(null);

	const fetchEntries = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/suppression");
			if (!res.ok) throw new Error("Failed to load suppression records");
			const data = (await res.json()) as { entries: SuppressionEntry[] };
			setEntries(data.entries || []);
		} catch (error) {
			notify.error(error, "Could not load suppression list");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void fetchEntries();
	}, []);

	const handleUnblock = async (id: string, email: string) => {
		try {
			setUnblockingId(id);
			const res = await fetch(`/api/suppression?id=${encodeURIComponent(id)}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to remove suppression entry");
			notify.success(`Unblocked ${email}`);
			setEntries((prev) => prev.filter((e) => e.id !== id));
		} catch (error) {
			notify.error(error, "Failed to unblock address");
		} finally {
			setUnblockingId(null);
		}
	};

	const formatReason = (reason: string) => {
		switch (reason) {
			case "hard_bounce":
				return { label: "Hard Bounce", color: "bg-rose-50 text-rose-700 border-rose-200" };
			case "soft_bounce":
				return { label: "Soft Bounce (3 Strikes)", color: "bg-amber-50 text-amber-700 border-amber-200" };
			case "unsubscribe":
				return { label: "Unsubscribed", color: "bg-neutral-50 text-neutral-700 border-neutral-200" };
			case "complaint":
				return { label: "Spam Complaint", color: "bg-purple-50 text-purple-700 border-purple-200" };
			default:
				return { label: "Blocked", color: "bg-neutral-50 text-neutral-700 border-neutral-200" };
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-medium text-neutral-900">Bounces & Suppression</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Addresses with delivery failures or unsubscribes are suppressed automatically to protect your sending IP reputation.
				</p>
			</div>

			<Card className="rounded-3xl border-0 bg-white p-6 shadow-xs">
				<CardHeader className="py-0">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<CardTitle className="text-lg font-semibold">Reputation Guard Policy</CardTitle>
							<CardDescription className="text-sm text-neutral-500">
								Outbound sends to these addresses are blocked before reaching external mail systems (Google, Yahoo, Outlook).
							</CardDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void fetchEntries()}
							disabled={loading}
							className="self-start sm:self-auto gap-1.5"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
							Refresh
						</Button>
					</div>
				</CardHeader>

				<CardContent className="pt-6">
					{loading ? (
						<div className="py-12 text-center text-sm text-neutral-400">Loading suppression records...</div>
					) : entries.length === 0 ? (
						<div className="py-12 text-center space-y-2">
							<ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
							<p className="font-medium text-neutral-800">No Suppressed Addresses</p>
							<p className="text-sm text-neutral-500 max-w-sm mx-auto">
								Your deliverability reputation is optimal. No addresses are blocked for delivery failures.
							</p>
						</div>
					) : (
						<div className="divide-y divide-neutral-100">
							{entries.map((entry) => {
								const reasonInfo = formatReason(entry.reason);
								return (
									<div key={entry.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-medium text-neutral-900">{entry.email}</span>
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${reasonInfo.color}`}>
													{reasonInfo.label}
												</span>
												{entry.bounceCode && (
													<span className="font-mono text-xs text-neutral-400">({entry.bounceCode})</span>
												)}
											</div>
											{entry.details && (
												<p className="text-xs text-neutral-500 line-clamp-1 max-w-xl font-mono">{entry.details}</p>
											)}
											<p className="text-xs text-neutral-400">
												Last detected: {new Date(entry.updatedAt).toLocaleDateString()} &middot; Strikes: {entry.bounceCount}
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => void handleUnblock(entry.id, entry.email)}
											disabled={unblockingId === entry.id}
										>
											{unblockingId === entry.id ? "Unblocking..." : "Unblock"}
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
