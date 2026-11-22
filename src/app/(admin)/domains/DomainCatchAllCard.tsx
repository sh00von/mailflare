"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox, Check, Mail } from "@/components/icons";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { authFetch } from "@/lib/auth/client";
import { notify } from "@/lib/notify";

type DomainCatchAllProps = {
	domainId: string;
	hostname: string;
};

type MailboxOption = {
	id: string;
	address: string;
	localPart: string;
};

export function DomainCatchAllCard({ domainId, hostname }: DomainCatchAllProps) {
	const [enabled, setEnabled] = useState(false);
	const [mailboxId, setMailboxId] = useState<string>("");
	const [mailboxes, setMailboxes] = useState<MailboxOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [catchAllRes, mailboxesRes] = await Promise.all([
				authFetch(`/api/domains/${domainId}/catch-all`),
				authFetch("/api/mailboxes"),
			]);

			if (catchAllRes.ok) {
				const catchAllData = (await catchAllRes.json()) as { catchAll: { enabled: boolean; mailboxId: string | null } };
				setEnabled(catchAllData.catchAll?.enabled ?? false);
				setMailboxId(catchAllData.catchAll?.mailboxId ?? "");
			}

			if (mailboxesRes.ok) {
				const data = (await mailboxesRes.json()) as { mailboxes: Array<{ id: string; domainId: string; address: string; localPart: string }> };
				const domainMailboxes = (data.mailboxes || [])
					.filter((m) => m.domainId === domainId || m.address?.endsWith(`@${hostname}`))
					.map((m) => ({ id: m.id, address: m.address, localPart: m.localPart }));
				setMailboxes(domainMailboxes);
				if (domainMailboxes.length > 0 && !mailboxId) {
					setMailboxId(domainMailboxes[0].id);
				}
			}
		} catch (err) {
			console.error("Failed to load catch-all settings:", err);
		} finally {
			setIsLoading(false);
		}
	}, [domainId, hostname, mailboxId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	async function updateCatchAll(nextEnabled: boolean, nextMailboxId: string) {
		if (nextEnabled && !nextMailboxId && mailboxes.length > 0) {
			nextMailboxId = mailboxes[0].id;
			setMailboxId(nextMailboxId);
		}

		setIsSaving(true);
		try {
			const res = await authFetch(`/api/domains/${domainId}/catch-all`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					enabled: nextEnabled,
					mailboxId: nextMailboxId || null,
				}),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(errData.error || "Failed to update catch-all configuration");
			}

			setEnabled(nextEnabled);
			notify.success(nextEnabled ? "Catch-all mailbox enabled" : "Catch-all mailbox disabled");
		} catch (err) {
			notify.error(err, "Could not update catch-all");
		} finally {
			setIsSaving(false);
		}
	}

	if (isLoading) return null;

	return (
		<div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
						<Inbox className="h-5 w-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-neutral-900">Domain Catch-All Email</h3>
							<span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
								*@{hostname}
							</span>
						</div>
						<p className="text-xs text-neutral-500 mt-0.5">
							Capture emails sent to unassigned or misspelled addresses on {hostname} instead of bouncing them.
						</p>
					</div>
				</div>
				<Switch
					checked={enabled}
					disabled={isSaving || mailboxes.length === 0}
					onCheckedChange={(checked) => updateCatchAll(checked, mailboxId)}
				/>
			</div>

			{enabled && (
				<div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
					<span>Route all unassigned <strong>*@{hostname}</strong> emails to:</span>
					<Select
						value={mailboxId}
						onChange={(e) => {
							const newId = e.target.value;
							setMailboxId(newId);
							updateCatchAll(true, newId);
						}}
						className="h-8 rounded-lg text-xs bg-neutral-50 border-neutral-200"
					>
						{mailboxes.map((m) => (
							<option key={m.id} value={m.id}>
								{m.address || `${m.localPart}@${hostname}`}
							</option>
						))}
					</Select>
				</div>
			)}
		</div>
	);
}
