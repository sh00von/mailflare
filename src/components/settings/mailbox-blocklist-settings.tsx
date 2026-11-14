"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { authFetch } from "@/lib/auth/client";
import { Ban, LoaderCircle, ShieldAlert, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BlockedContact = {
	id: string;
	email: string;
	displayName: string | null;
	createdAt: string;
};

export function MailboxBlocklistSettings() {
	const { selectedMailbox } = useSelectedMailbox();
	const [blockedList, setBlockedList] = useState<BlockedContact[]>([]);
	const [loading, setLoading] = useState(true);
	const [newAddress, setNewAddress] = useState("");
	const [adding, setAdding] = useState(false);
	const [unblockingId, setUnblockingId] = useState<string | null>(null);

	async function loadBlocked() {
		setLoading(true);
		try {
			const res = await authFetch("/api/contacts/block");
			if (!res.ok) throw new Error("Could not load blocked senders");
			const data = (await res.json()) as { blockedContacts?: BlockedContact[] };
			setBlockedList(data.blockedContacts ?? []);
		} catch (err) {
			notify.error(err, "Failed to load blocked contacts");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadBlocked();
	}, []);

	async function onAddBlock(e: React.FormEvent) {
		e.preventDefault();
		const clean = newAddress.trim().toLowerCase();
		if (!clean || !selectedMailbox) return;

		setAdding(true);
		try {
			const res = await authFetch("/api/contacts/block", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					mailboxId: selectedMailbox.id,
					address: clean,
				}),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "Failed to block sender");
			}
			notify.success(`Blocked ${clean}`);
			setNewAddress("");
			await loadBlocked();
		} catch (err) {
			notify.error(err, "Could not block sender");
		} finally {
			setAdding(false);
		}
	}

	async function onUnblock(address: string) {
		if (!selectedMailbox) return;
		setUnblockingId(address);
		try {
			const res = await authFetch("/api/contacts/block", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					mailboxId: selectedMailbox.id,
					address,
				}),
			});
			if (!res.ok) throw new Error("Failed to unblock address");
			notify.success(`Unblocked ${address}`);
			await loadBlocked();
		} catch (err) {
			notify.error(err, "Could not unblock sender");
		} finally {
			setUnblockingId(null);
		}
	}

	return (
		<div className="space-y-6">
			{/* Add Block Rule Card */}
			<section className="space-y-4 rounded-3xl bg-white p-6 shadow-xs border border-neutral-100">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">Block a sender</h2>
					<p className="text-xs text-neutral-500 mt-1">
						Emails from blocked senders or domains are automatically moved directly to Trash.
					</p>
				</div>

				<form onSubmit={onAddBlock} className="flex flex-col sm:flex-row gap-3">
					<Input
						type="email"
						placeholder="spammer@example.com"
						value={newAddress}
						onChange={(e) => setNewAddress(e.target.value)}
						required
						className="flex-1"
						disabled={adding || !selectedMailbox}
					/>
					<Button
						type="submit"
						disabled={adding || !newAddress.trim() || !selectedMailbox}
						className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
					>
						{adding ? (
							<span className="flex items-center gap-2">
								<LoaderCircle className="h-4 w-4 animate-spin" />
								Blocking...
							</span>
						) : (
							<>
								<Ban className="h-4 w-4" />
								Block sender
							</>
						)}
					</Button>
				</form>
			</section>

			{/* Blocked List Table / Card */}
			<section className="space-y-4 rounded-3xl bg-white p-6 shadow-xs border border-neutral-100">
				<div>
					<h3 className="text-base font-semibold text-neutral-900">Blocked Senders ({blockedList.length})</h3>
					<p className="text-xs text-neutral-500 mt-0.5">
						Senders you have blocked across your mailboxes.
					</p>
				</div>

				{loading ? (
					<div className="py-8 text-center text-sm text-neutral-500">
						<LoaderCircle className="mx-auto h-5 w-5 animate-spin text-neutral-400 mb-2" />
						Loading blocked senders...
					</div>
				) : blockedList.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-3">
							<ShieldAlert className="h-6 w-6" />
						</div>
						<p className="text-sm font-medium text-neutral-800">No blocked senders</p>
						<p className="text-xs text-neutral-400 max-w-sm mt-1">
							When you block unwanted contacts or spam senders, they will be listed here.
						</p>
					</div>
				) : (
					<ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
						{blockedList.map((contact) => (
							<li key={contact.id} className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50/60 transition">
								<div className="flex items-center gap-3 min-w-0">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
										<Ban className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-neutral-900">
											{contact.email}
										</p>
										{contact.displayName && (
											<p className="truncate text-xs text-neutral-500">
												{contact.displayName}
											</p>
										)}
									</div>
								</div>

								<Button
									variant="outline"
									size="sm"
									onClick={() => onUnblock(contact.email)}
									disabled={unblockingId === contact.email}
									className="rounded-lg text-xs text-neutral-600 hover:text-red-700 hover:border-red-200 gap-1.5"
								>
									{unblockingId === contact.email ? (
										<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
									) : (
										"Unblock"
									)}
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
