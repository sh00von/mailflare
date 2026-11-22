"use client";

import { useEffect, useState, useCallback } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { InboxSwitcher } from "./inbox-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ListFilter, Plus, Trash2, Folder, ShieldAlert, ArrowRight } from "@/components/icons";
import { authFetch } from "@/lib/auth/client";
import { notify } from "@/lib/notify";

type FilterRule = {
	id: string;
	name: string;
	enabled: boolean;
	matchField: "email" | "content" | "title" | "sender" | "recipient";
	matchOperator: "contains" | "exact" | "starts_with" | "ends_with";
	matchValue: string;
	action: "store" | "spam" | "trash";
	folderId: string | null;
	folderName: string | null;
	createdAt: string;
};

type MailboxFolder = {
	id: string;
	name: string;
	color: string;
};

export function MailboxRulesSettings() {
	const { selectedMailbox } = useSelectedMailbox();
	const [rules, setRules] = useState<FilterRule[]>([]);
	const [folders, setFolders] = useState<MailboxFolder[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// New Rule Form State
	const [name, setName] = useState("");
	const [matchField, setMatchField] = useState<FilterRule["matchField"]>("sender");
	const [matchOperator, setMatchOperator] = useState<FilterRule["matchOperator"]>("contains");
	const [matchValue, setMatchValue] = useState("");
	const [action, setAction] = useState<FilterRule["action"]>("store");
	const [folderId, setFolderId] = useState("");

	const loadData = useCallback(async (mailboxId: string) => {
		setIsLoading(true);
		try {
			const [rulesRes, foldersRes] = await Promise.all([
				authFetch(`/api/mailboxes/${mailboxId}/rules`),
				authFetch(`/api/folders?mailboxId=${mailboxId}`),
			]);

			if (rulesRes.ok) {
				const rulesData = (await rulesRes.json()) as { rules: FilterRule[] };
				setRules(rulesData.rules || []);
			}
			if (foldersRes.ok) {
				const foldersData = (await foldersRes.json()) as { folders: MailboxFolder[] };
				setFolders(foldersData.folders || []);
				if (foldersData.folders?.length && !folderId) {
					setFolderId(foldersData.folders[0].id);
				}
			}
		} catch (err) {
			notify.error(err, "Failed to load rules");
		} finally {
			setIsLoading(false);
		}
	}, [folderId]);

	useEffect(() => {
		if (selectedMailbox?.id) {
			loadData(selectedMailbox.id);
		}
	}, [selectedMailbox?.id, loadData]);

	async function handleCreateRule(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedMailbox || !name.trim() || !matchValue.trim()) return;

		setIsSubmitting(true);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/rules`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					matchField,
					matchOperator,
					matchValue: matchValue.trim(),
					action,
					folderId: action === "store" ? (folderId || null) : null,
				}),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(errData.error || "Failed to create rule");
			}

			notify.success("Filter rule created");
			setIsModalOpen(false);
			setName("");
			setMatchValue("");
			loadData(selectedMailbox.id);
		} catch (err) {
			notify.error(err, "Could not save rule");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDeleteRule(ruleId: string) {
		if (!selectedMailbox) return;
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/rules/${ruleId}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete rule");
			notify.success("Rule removed");
			setRules((prev) => prev.filter((r) => r.id !== ruleId));
		} catch (err) {
			notify.error(err, "Could not delete rule");
		}
	}

	const fieldLabels: Record<string, string> = {
		sender: "Sender",
		recipient: "Recipient",
		title: "Subject",
		content: "Body Content",
		email: "Any Address",
	};

	const operatorLabels: Record<string, string> = {
		contains: "contains",
		exact: "matches exactly",
		starts_with: "starts with",
		ends_with: "ends with",
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-xl font-semibold text-neutral-900">Rules & Filters</h1>
					<p className="mt-1 text-sm text-neutral-500">
						Automatically organize incoming mail into folders, or route spam and unwanted items.
					</p>
				</div>
				<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
					<DialogTrigger asChild>
						<Button className="min-h-[44px] gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700">
							<Plus className="h-4 w-4" />
							Create New Filter
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-md rounded-3xl p-6">
						<DialogHeader>
							<DialogTitle className="text-lg font-bold text-neutral-900">New Inbound Filter</DialogTitle>
							<DialogDescription className="text-sm text-neutral-500">
								When incoming messages match this rule, the selected action will run automatically.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleCreateRule} className="space-y-4 pt-3">
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
									Rule Name
								</label>
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. GitHub notifications to folder"
									className="h-10 rounded-xl"
									required
								/>
							</div>

							<div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
								<p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Condition</p>
								<div className="grid grid-cols-2 gap-2">
									<Select
										value={matchField}
										onChange={(e) => setMatchField(e.target.value as FilterRule["matchField"])}
										className="h-9 rounded-lg text-xs"
									>
										<option value="sender">Sender (From)</option>
										<option value="title">Subject</option>
										<option value="recipient">Recipient (To)</option>
										<option value="content">Body Content</option>
									</Select>
									<Select
										value={matchOperator}
										onChange={(e) => setMatchOperator(e.target.value as FilterRule["matchOperator"])}
										className="h-9 rounded-lg text-xs"
									>
										<option value="contains">contains</option>
										<option value="exact">is exactly</option>
										<option value="starts_with">starts with</option>
										<option value="ends_with">ends with</option>
									</Select>
								</div>
								<Input
									value={matchValue}
									onChange={(e) => setMatchValue(e.target.value)}
									placeholder="Text or email address..."
									className="h-9 rounded-lg text-sm bg-white"
									required
								/>
							</div>

							<div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
								<p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Action</p>
								<Select
									value={action}
									onChange={(e) => setAction(e.target.value as FilterRule["action"])}
									className="h-9 rounded-lg text-xs w-full"
								>
									<option value="store">Move to folder</option>
									<option value="spam">Mark as Spam</option>
									<option value="trash">Move to Trash</option>
								</Select>

								{action === "store" && (
									<div>
										<label className="block text-xs font-medium text-neutral-600 mb-1">
											Select destination folder:
										</label>
										<Select
											value={folderId}
											onChange={(e) => setFolderId(e.target.value)}
											className="h-9 rounded-lg text-xs w-full bg-white"
										>
											{folders.length === 0 && <option value="">No custom folders created yet</option>}
											{folders.map((f) => (
												<option key={f.id} value={f.id}>{f.name}</option>
											))}
										</Select>
									</div>
								)}
							</div>

							<div className="flex justify-end gap-2 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsModalOpen(false)}
									className="h-10 rounded-full"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="h-10 rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700"
								>
									{isSubmitting ? "Creating..." : "Save Filter"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<InboxSwitcher />

			{isLoading ? (
				<div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : rules.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center shadow-xs">
					<ListFilter className="mx-auto h-8 w-8 text-neutral-400" />
					<h3 className="mt-3 text-sm font-semibold text-neutral-900">No filter rules configured</h3>
					<p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
						Keep your inbox clean by setting up automatic rules to sort incoming emails into custom folders.
					</p>
				</div>
			) : (
				<div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
					{rules.map((rule) => (
						<div key={rule.id} className="flex items-center justify-between p-4 hover:bg-neutral-50/70 transition-colors">
							<div className="space-y-1">
								<p className="font-semibold text-sm text-neutral-900">{rule.name}</p>
								<div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
									<span>If <strong>{fieldLabels[rule.matchField] || rule.matchField}</strong> {operatorLabels[rule.matchOperator] || rule.matchOperator} <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">"{rule.matchValue}"</code></span>
									<ArrowRight className="h-3 w-3 text-neutral-400" />
									<span className="font-medium text-blue-700 inline-flex items-center gap-1">
										{rule.action === "store" ? (
											<>
												<Folder className="h-3.5 w-3.5 text-blue-600" />
												Move to {rule.folderName || "folder"}
											</>
										) : rule.action === "spam" ? (
											<>
												<ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
												Mark as Spam
											</>
										) : (
											<>
												<Trash2 className="h-3.5 w-3.5 text-red-600" />
												Move to Trash
											</>
										)}
									</span>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => handleDeleteRule(rule.id)}
								className="h-9 w-9 p-0 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full"
								aria-label={`Delete rule ${rule.name}`}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
