"use client";

import { useEffect, useState, useCallback } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { InboxSwitcher } from "./inbox-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AtSign, Plus, Trash2, Mail, Globe2 } from "@/components/icons";
import { authFetch } from "@/lib/auth/client";
import { notify } from "@/lib/notify";

type AliasItem = {
	id: string;
	domainId: string;
	localPart: string;
	hostname: string;
	createdAt?: string;
};

type DomainOption = {
	id: string;
	hostname: string;
};

export function MailboxAliasesSettings() {
	const { selectedMailbox, setSelectedMailbox, isLoading: isMailboxLoading } = useSelectedMailbox();
	const [aliases, setAliases] = useState<AliasItem[]>([]);
	const [availableDomains, setAvailableDomains] = useState<DomainOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [newLocalPart, setNewLocalPart] = useState("");
	const [newDomainId, setNewDomainId] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [useAllDomains, setUseAllDomains] = useState(false);
	const [savingAllDomains, setSavingAllDomains] = useState(false);

	const fetchAliases = useCallback(async (mailboxId: string) => {
		setIsLoading(true);
		try {
			const res = await authFetch(`/api/mailboxes/${mailboxId}/aliases`);
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as Record<string, any>;
				throw new Error(data.error || "Failed to load aliases");
			}
			const data = (await res.json()) as { aliases: AliasItem[]; availableDomains: DomainOption[] };
			setAliases(data.aliases || []);
			setAvailableDomains(data.availableDomains || []);
			if (data.availableDomains && data.availableDomains.length > 0) {
				setNewDomainId((prev) => (prev ? prev : data.availableDomains[0].id));
			}
		} catch (err) {
			notify.error(err, "Failed to load mailbox aliases");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedMailbox?.id) {
			setUseAllDomains(!!selectedMailbox.useAllDomains);
			fetchAliases(selectedMailbox.id);
		}
	}, [selectedMailbox?.id, selectedMailbox?.useAllDomains, fetchAliases]);

	async function handleAddAlias(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedMailbox || !newLocalPart.trim() || !newDomainId) return;

		setIsAdding(true);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/aliases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					localPart: newLocalPart.trim().toLowerCase(),
					domainId: newDomainId,
				}),
			});

			const data = (await res.json()) as Record<string, any>;
			if (!res.ok) {
				throw new Error(data.error || "Failed to create alias");
			}

			setAliases(data.aliases || []);
			setNewLocalPart("");
			notify.success("Alias created successfully");
		} catch (err) {
			notify.error(err, "Could not add alias");
		} finally {
			setIsAdding(false);
		}
	}

	async function handleDeleteAlias(aliasId: string) {
		if (!selectedMailbox) return;
		if (!confirm("Are you sure you want to remove this alias address?")) return;

		setDeletingId(aliasId);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/aliases?aliasId=${encodeURIComponent(aliasId)}`, {
				method: "DELETE",
			});

			const data = (await res.json()) as Record<string, any>;
			if (!res.ok) {
				throw new Error(data.error || "Failed to delete alias");
			}

			setAliases(data.aliases || []);
			notify.success("Alias removed");
		} catch (err) {
			notify.error(err, "Could not remove alias");
		} finally {
			setDeletingId(null);
		}
	}

	async function handleToggleUseAllDomains(checked: boolean) {
		if (!selectedMailbox) return;
		setSavingAllDomains(true);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ useAllDomains: checked }),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as Record<string, any>;
				throw new Error(data.error || "Failed to update domain routing");
			}
			setUseAllDomains(checked);
			setSelectedMailbox({ ...selectedMailbox, useAllDomains: checked });
			notify.success(checked ? "Now receiving across all domains" : "Catch-all across all domains disabled");
		} catch (err) {
			notify.error(err, "Could not update domain settings");
		} finally {
			setSavingAllDomains(false);
		}
	}

	if (isMailboxLoading) {
		return (
			<div className="space-y-6 py-4">
				<Skeleton className="h-10 w-48 rounded-xl" />
				<Skeleton className="h-64 w-full rounded-3xl" />
			</div>
		);
	}

	if (!selectedMailbox) {
		return (
			<div className="py-8 text-center text-neutral-500">
				Please select or create a mailbox to manage email aliases.
			</div>
		);
	}

	const canManage = selectedMailbox.permission === "full_access" || !selectedMailbox.permission;

	return (
		<div className="space-y-8 py-4">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Email Aliases</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Create alternate email addresses that deliver directly into this mailbox.
				</p>
			</div>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Current Mailbox</h2>
					<p className="mt-1 text-sm text-neutral-500">Select which mailbox you are configuring aliases for.</p>
				</div>
				<div className="rounded-3xl bg-white p-6 shadow-sm">
					<InboxSwitcher />
				</div>
			</section>

			{/* Use All Domains card */}
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Multi-Domain Catch</h2>
					<p className="mt-1 text-sm text-neutral-500">Automatically receive mail across all verified domains in your account.</p>
				</div>
				<div className="rounded-3xl bg-white p-6 shadow-sm">
					<label className="flex items-start gap-3 cursor-pointer">
						<Checkbox
							checked={useAllDomains}
							disabled={!canManage || savingAllDomains}
							onChange={(e) => handleToggleUseAllDomains(e.target.checked)}
							className="mt-0.5"
						/>
						<div>
							<div className="flex items-center gap-2">
								<Globe2 className="h-4 w-4 text-blue-600" />
								<span className="text-sm font-semibold text-neutral-900">Receive on all domain names</span>
							</div>
							<p className="mt-1 text-xs text-neutral-500 leading-relaxed">
								When enabled, any email sent to <code className="font-semibold text-neutral-700">{selectedMailbox.localPart}@any-active-domain.com</code> in your organization will be automatically routed to this inbox.
							</p>
						</div>
					</label>
				</div>
			</section>

			{/* Existing Aliases */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl font-semibold text-neutral-900">Active Aliases</h2>
						<p className="mt-1 text-sm text-neutral-500">Addresses pointing to this inbox.</p>
					</div>
					<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
						{aliases.length} {aliases.length === 1 ? "alias" : "aliases"}
					</span>
				</div>

				<div className="divide-y divide-neutral-100 rounded-3xl bg-white p-6 shadow-sm">
					{isLoading ? (
						<div className="space-y-3 py-2">
							<Skeleton className="h-12 w-full rounded-xl" />
							<Skeleton className="h-12 w-full rounded-xl" />
						</div>
					) : aliases.length === 0 ? (
						<div className="py-8 text-center">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
								<AtSign className="h-6 w-6" />
							</div>
							<p className="mt-3 text-sm font-medium text-neutral-900">No aliases assigned yet</p>
							<p className="mt-1 text-xs text-neutral-500">Add an alias address below to receive mail from other addresses in this inbox.</p>
						</div>
					) : (
						aliases.map((alias) => (
							<div key={alias.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
										<Mail className="h-4 w-4" />
									</div>
									<div>
										<p className="text-sm font-semibold text-neutral-900">
											{alias.localPart}@{alias.hostname}
										</p>
										<p className="text-xs text-neutral-400">Routes to {selectedMailbox.localPart}@{selectedMailbox.hostname}</p>
									</div>
								</div>
								{canManage && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={deletingId === alias.id}
										onClick={() => handleDeleteAlias(alias.id)}
										className="text-neutral-400 hover:text-red-600 hover:bg-red-50"
										title="Remove alias"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						))
					)}
				</div>
			</section>

			{/* Add Alias Form */}
			{canManage && (
				<section className="space-y-4">
					<div>
						<h2 className="text-xl font-semibold text-neutral-900">Add New Alias</h2>
						<p className="mt-1 text-sm text-neutral-500">Create a specific alias address on any of your active domains.</p>
					</div>

					<div className="rounded-3xl bg-white p-6 shadow-sm">
						{availableDomains.length === 0 ? (
							<p className="text-sm text-neutral-500">
								No active domains available to create aliases. Add and verify a domain first.
							</p>
						) : (
							<form onSubmit={handleAddAlias} className="space-y-4">
								<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
									<div className="flex flex-1 items-center rounded-xl border border-neutral-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
										<Input
											value={newLocalPart}
											onChange={(e) => setNewLocalPart(e.target.value)}
											placeholder="e.g. sales, support, billing"
											pattern="[a-zA-Z0-9._%+\-]+"
											maxLength={64}
											required
											className="border-0 shadow-none px-0 focus-visible:ring-0 text-sm"
										/>
										<span className="text-neutral-400 font-semibold px-2">@</span>
										<Select
											value={newDomainId}
											onChange={(e) => setNewDomainId(e.target.value)}
											className="border-0 bg-transparent text-sm font-medium focus-visible:ring-0"
										>
											{availableDomains.map((domain) => (
												<option key={domain.id} value={domain.id}>
													{domain.hostname}
												</option>
											))}
										</Select>
									</div>
									<Button type="submit" disabled={isAdding || !newLocalPart.trim()} className="shrink-0">
										<Plus className="h-4 w-4 mr-1.5" />
										{isAdding ? "Adding..." : "Add Alias"}
									</Button>
								</div>
								<p className="text-xs text-neutral-500">
									Letters, numbers, dots, and hyphens supported.
								</p>
							</form>
						)}
					</div>
				</section>
			)}
		</div>
	);
}
