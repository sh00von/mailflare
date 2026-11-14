"use client";

import { useEffect, useState, useCallback } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { InboxSwitcher } from "./inbox-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CornerDownRight, Check, ShieldCheck } from "@/components/icons";
import { authFetch } from "@/lib/auth/client";
import { notify } from "@/lib/notify";

type ForwardingState = {
	enabled: boolean;
	forwardTo: string;
	keepCopy: boolean;
};

export function MailboxForwardingSettings() {
	const { selectedMailbox, isLoading: isMailboxLoading } = useSelectedMailbox();
	const [forwarding, setForwarding] = useState<ForwardingState>({
		enabled: false,
		forwardTo: "",
		keepCopy: true,
	});
	const [savedState, setSavedState] = useState<ForwardingState>({
		enabled: false,
		forwardTo: "",
		keepCopy: true,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const fetchForwarding = useCallback(async (mailboxId: string) => {
		setIsLoading(true);
		try {
			const res = await authFetch(`/api/mailboxes/${mailboxId}/forwarding`);
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as Record<string, any>;
				throw new Error(data.error || "Failed to load forwarding configuration");
			}
			const data = (await res.json()) as { forwarding: ForwardingState };
			if (data.forwarding) {
				setForwarding(data.forwarding);
				setSavedState(data.forwarding);
			}
		} catch (err) {
			notify.error(err, "Could not load forwarding settings");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedMailbox?.id) {
			fetchForwarding(selectedMailbox.id);
		}
	}, [selectedMailbox?.id, fetchForwarding]);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedMailbox) return;

		if (forwarding.enabled && !forwarding.forwardTo.trim()) {
			notify.error("Please provide a destination email address to enable forwarding.");
			return;
		}

		setIsSaving(true);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/forwarding`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					enabled: forwarding.enabled,
					forwardTo: forwarding.forwardTo.trim(),
					keepCopy: forwarding.keepCopy,
				}),
			});

			const data = (await res.json()) as { error?: string; forwarding: ForwardingState };
			if (!res.ok) {
				throw new Error(data.error || "Failed to update forwarding");
			}

			setForwarding(data.forwarding);
			setSavedState(data.forwarding);
			notify.success(
				data.forwarding.enabled
					? `Forwarding enabled to ${data.forwarding.forwardTo}`
					: "Email forwarding disabled",
			);
		} catch (err) {
			notify.error(err, "Failed to save forwarding configuration");
		} finally {
			setIsSaving(false);
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
				Please select or create a mailbox to manage email forwarding.
			</div>
		);
	}

	const canManage = selectedMailbox.permission === "full_access" || !selectedMailbox.permission;
	const isDirty =
		forwarding.enabled !== savedState.enabled ||
		forwarding.forwardTo.trim() !== savedState.forwardTo.trim() ||
		forwarding.keepCopy !== savedState.keepCopy;

	return (
		<div className="space-y-8 py-4">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Email Forwarding</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Automatically forward incoming emails from this mailbox to another external or internal email address.
				</p>
			</div>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Current Mailbox</h2>
					<p className="mt-1 text-sm text-neutral-500">Select which mailbox you are configuring forwarding for.</p>
				</div>
				<div className="rounded-3xl bg-white p-6 shadow-sm">
					<InboxSwitcher />
				</div>
			</section>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Forwarding Configuration</h2>
					<p className="mt-1 text-sm text-neutral-500">Set up automatic forwarding rules for incoming messages.</p>
				</div>

				<div className="rounded-3xl bg-white p-6 shadow-sm">
					{isLoading ? (
						<div className="space-y-4 py-2">
							<Skeleton className="h-10 w-full rounded-xl" />
							<Skeleton className="h-10 w-full rounded-xl" />
						</div>
					) : (
						<form onSubmit={handleSave} className="space-y-6">
							{/* Toggle Forwarding */}
							<label className="flex items-start gap-3 cursor-pointer">
								<Checkbox
									checked={forwarding.enabled}
									disabled={!canManage || isSaving}
									onChange={(e) =>
										setForwarding((prev) => ({
											...prev,
											enabled: e.target.checked,
										}))
									}
									className="mt-0.5"
								/>
								<div>
									<div className="flex items-center gap-2">
										<CornerDownRight className="h-4 w-4 text-blue-600" />
										<span className="text-sm font-semibold text-neutral-900">
											Enable email forwarding for this mailbox
										</span>
									</div>
									<p className="mt-1 text-xs text-neutral-500 leading-relaxed">
										Incoming messages sent to{" "}
										<code className="font-semibold text-neutral-700">
											{selectedMailbox.localPart}@{selectedMailbox.hostname}
										</code>{" "}
										(and its aliases) will be automatically re-routed to your target address.
									</p>
								</div>
							</label>

							{/* Forward To Email Input */}
							<div className="space-y-2 border-t border-neutral-100 pt-5">
								<label htmlFor="forwardToInput" className="block text-sm font-medium text-neutral-900">
									Forward incoming emails to:
								</label>
								<div className="max-w-md">
									<Input
										id="forwardToInput"
										type="email"
										disabled={!canManage || !forwarding.enabled || isSaving}
										value={forwarding.forwardTo}
										onChange={(e) =>
											setForwarding((prev) => ({
												...prev,
												forwardTo: e.target.value,
											}))
										}
										placeholder="e.g. personal@gmail.com, team@company.com"
										className="h-11 rounded-xl text-sm"
										required={forwarding.enabled}
									/>
								</div>
								<p className="text-xs text-neutral-400">
									Destination where forwarded emails should be sent.
								</p>
							</div>

							{/* Keep Copy Option */}
							<div className="space-y-2 border-t border-neutral-100 pt-5">
								<label className="flex items-start gap-3 cursor-pointer">
									<Checkbox
										checked={forwarding.keepCopy}
										disabled={!canManage || !forwarding.enabled || isSaving}
										onChange={(e) =>
											setForwarding((prev) => ({
												...prev,
												keepCopy: e.target.checked,
											}))
										}
										className="mt-0.5"
									/>
									<div>
										<span className="text-sm font-medium text-neutral-900">
											Keep a copy in this mailbox
										</span>
										<p className="mt-1 text-xs text-neutral-500 leading-relaxed">
											Recommended. When checked, a copy remains in your webmail inbox here while also being delivered to your forward address. If unchecked, incoming emails are forwarded and not stored in this mailbox.
										</p>
									</div>
								</label>
							</div>

							{/* Actions */}
							{canManage && (
								<div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
									<Button type="submit" disabled={isSaving || !isDirty}>
										<Check className="h-4 w-4 mr-1.5" />
										{isSaving ? "Saving..." : "Save Forwarding Settings"}
									</Button>
									{savedState.enabled && (
										<span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
											<ShieldCheck className="h-3.5 w-3.5" /> Forwarding Active
										</span>
									)}
								</div>
							)}
						</form>
					)}
				</div>
			</section>
		</div>
	);
}
