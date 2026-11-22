"use client";

import { useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import {
	AlertCircle,
	Check,
	Copy,
	RefreshCw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFilter, setSelectedFilter] = useState<string>("all");
	const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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

	const copyEmail = (email: string) => {
		void navigator.clipboard.writeText(email).then(() => {
			setCopiedEmail(email);
			setTimeout(() => setCopiedEmail(null), 1500);
		});
	};

	const formatReason = (reason: string) => {
		switch (reason) {
			case "hard_bounce":
				return { label: "Hard Bounce", color: "bg-rose-50 text-rose-700 border-rose-200" };
			case "soft_bounce":
				return { label: "Soft Bounce", color: "bg-amber-50 text-amber-700 border-amber-200" };
			case "unsubscribe":
				return { label: "Unsubscribed", color: "bg-neutral-50 text-neutral-700 border-neutral-200" };
			case "complaint":
				return { label: "Spam Complaint", color: "bg-purple-50 text-purple-700 border-purple-200" };
			default:
				return { label: "Suppressed", color: "bg-neutral-50 text-neutral-700 border-neutral-200" };
		}
	};

	const filteredEntries = useMemo(() => {
		return entries.filter((entry) => {
			const matchesSearch =
				!searchQuery ||
				entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(entry.details && entry.details.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesFilter =
				selectedFilter === "all" || entry.reason === selectedFilter;

			return matchesSearch && matchesFilter;
		});
	}, [entries, searchQuery, selectedFilter]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-medium text-neutral-900">Bounces & Suppression</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Addresses with delivery failures or unsubscribes are suppressed automatically to protect your sending IP and domain reputation.
				</p>
			</div>

			<Card className="rounded-3xl border-0 bg-white p-6 shadow-xs">
				<CardHeader className="py-0 px-0">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<CardTitle className="text-lg font-semibold text-neutral-900">Reputation Guard Policy</CardTitle>
							<CardDescription className="text-sm text-neutral-500">
								Outbound sends to these addresses are blocked pre-flight before reaching external mail receivers (Google, Yahoo, Microsoft).
							</CardDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void fetchEntries()}
							disabled={loading}
							className="self-start sm:self-auto gap-1.5 bg-white shadow-2xs hover:bg-neutral-50 transition-all active:scale-95"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
							Refresh
						</Button>
					</div>

					{/* Search & Filter Bar */}
					<div className="mt-5 flex flex-col sm:flex-row gap-2.5">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
							<Input
								type="search"
								placeholder="Filter suppressed email addresses or domains..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 h-9 text-sm rounded-xl border-neutral-200 bg-neutral-50/60 focus:bg-white"
							/>
						</div>
						<div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
							{[
								{ id: "all", label: "All" },
								{ id: "hard_bounce", label: "Hard Bounces" },
								{ id: "soft_bounce", label: "Soft Bounces" },
								{ id: "unsubscribe", label: "Unsubscribes" },
								{ id: "complaint", label: "Complaints" },
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setSelectedFilter(tab.id)}
									className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors ${
										selectedFilter === tab.id
											? "bg-neutral-900 text-white"
											: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-6 px-0">
					{loading ? (
						<div className="py-12 text-center text-sm text-neutral-400">Loading suppression records...</div>
					) : filteredEntries.length === 0 ? (
						<div className="py-12 text-center space-y-2">
							<ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
							<p className="font-medium text-neutral-800">
								{searchQuery || selectedFilter !== "all"
									? "No matching suppressed addresses"
									: "No Suppressed Addresses"}
							</p>
							<p className="text-sm text-neutral-500 max-w-sm mx-auto">
								{searchQuery || selectedFilter !== "all"
									? "Try adjusting your search query or filter."
									: "Your deliverability reputation is optimal. Outbound emails are flowing cleanly."}
							</p>
						</div>
					) : (
						<div className="divide-y divide-neutral-100">
							{filteredEntries.map((entry) => {
								const reasonInfo = formatReason(entry.reason);
								return (
									<div
										key={entry.id}
										className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-neutral-50/60 px-2 rounded-xl transition-colors"
									>
										<div className="space-y-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-mono text-sm font-semibold text-neutral-900 truncate">
													{entry.email}
												</span>
												<button
													type="button"
													onClick={() => copyEmail(entry.email)}
													title="Copy email address"
													className="text-neutral-400 hover:text-neutral-700 transition-colors p-0.5 rounded"
												>
													{copiedEmail === entry.email ? (
														<Check className="h-3.5 w-3.5 text-emerald-600" />
													) : (
														<Copy className="h-3.5 w-3.5" />
													)}
												</button>
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
											className="shrink-0 self-start sm:self-auto text-xs h-8 border-neutral-200 hover:border-neutral-300 active:scale-95 transition-all"
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
