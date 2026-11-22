"use client";

import { useEffect, useState, useCallback } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { InboxSwitcher } from "./inbox-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Check, Clock } from "@/components/icons";
import { authFetch } from "@/lib/auth/client";
import { notify } from "@/lib/notify";

type VacationState = {
	enabled: boolean;
	startDate: string | null;
	endDate: string | null;
	subject: string;
	messageHtml: string;
};

export function MailboxVacationSettings() {
	const { selectedMailbox } = useSelectedMailbox();
	const [vacation, setVacation] = useState<VacationState>({
		enabled: false,
		startDate: "",
		endDate: "",
		subject: "Out of Office",
		messageHtml: "",
	});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const fetchVacation = useCallback(async (mailboxId: string) => {
		setIsLoading(true);
		try {
			const res = await authFetch(`/api/mailboxes/${mailboxId}/vacation`);
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error || "Failed to load vacation configuration");
			}
			const data = (await res.json()) as { vacation: VacationState };
			if (data.vacation) {
				setVacation({
					enabled: data.vacation.enabled,
					startDate: data.vacation.startDate ? data.vacation.startDate.slice(0, 10) : "",
					endDate: data.vacation.endDate ? data.vacation.endDate.slice(0, 10) : "",
					subject: data.vacation.subject || "Out of Office",
					messageHtml: data.vacation.messageHtml || "",
				});
			}
		} catch (err) {
			notify.error(err, "Could not load vacation settings");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedMailbox?.id) {
			fetchVacation(selectedMailbox.id);
		}
	}, [selectedMailbox?.id, fetchVacation]);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedMailbox) return;

		setIsSaving(true);
		try {
			const res = await authFetch(`/api/mailboxes/${selectedMailbox.id}/vacation`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					enabled: vacation.enabled,
					startDate: vacation.startDate ? new Date(vacation.startDate).toISOString() : null,
					endDate: vacation.endDate ? new Date(`${vacation.endDate}T23:59:59.999Z`).toISOString() : null,
					subject: vacation.subject.trim() || "Out of Office",
					messageHtml: vacation.messageHtml.trim(),
				}),
			});

			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error || "Failed to save vacation responder");
			}

			notify.success("Vacation auto-responder updated successfully");
		} catch (err) {
			notify.error(err, "Could not save vacation settings");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold text-neutral-900">Vacation Responder</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Send automated replies to incoming emails while you are away or out of the office.
				</p>
			</div>

			<InboxSwitcher />

			{isLoading ? (
				<div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
					<div className="flex items-center justify-between border-b border-neutral-100 pb-5">
						<div className="space-y-0.5">
							<span className="flex items-center gap-2 font-medium text-neutral-900">
								<CalendarClock className="h-4 w-4 text-emerald-600" />
								Enable Out of Office Responder
							</span>
							<p className="text-xs text-neutral-500">
								Automatically sends replies. Only replies once every 4 days per unique sender to prevent email loops.
							</p>
						</div>
						<Switch
							checked={vacation.enabled}
							onCheckedChange={(checked) => setVacation((v) => ({ ...v, enabled: checked }))}
						/>
					</div>

					<div className={`space-y-5 transition-opacity ${vacation.enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label htmlFor="start-date" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
									First Day (Optional)
								</label>
								<Input
									id="start-date"
									type="date"
									value={vacation.startDate ?? ""}
									onChange={(e) => setVacation((v) => ({ ...v, startDate: e.target.value }))}
									className="h-11 rounded-xl"
								/>
							</div>
							<div>
								<label htmlFor="end-date" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
									Last Day (Optional)
								</label>
								<Input
									id="end-date"
									type="date"
									value={vacation.endDate ?? ""}
									onChange={(e) => setVacation((v) => ({ ...v, endDate: e.target.value }))}
									className="h-11 rounded-xl"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="vacation-subject" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
								Response Subject
							</label>
							<Input
								id="vacation-subject"
								type="text"
								value={vacation.subject}
								onChange={(e) => setVacation((v) => ({ ...v, subject: e.target.value }))}
								placeholder="Out of Office"
								className="h-11 rounded-xl"
								required={vacation.enabled}
							/>
						</div>

						<div>
							<label htmlFor="vacation-body" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
								Message Body
							</label>
							<textarea
								id="vacation-body"
								rows={5}
								value={vacation.messageHtml}
								onChange={(e) => setVacation((v) => ({ ...v, messageHtml: e.target.value }))}
								placeholder="Hi there, thank you for your email. I am currently away from my desk with limited access to email. I will respond to your message upon my return."
								className="w-full rounded-xl border border-neutral-300 p-3.5 text-sm text-neutral-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
							/>
						</div>
					</div>

					<div className="flex justify-end pt-2">
						<Button
							type="submit"
							disabled={isSaving}
							className="min-h-[44px] rounded-full bg-blue-600 px-6 font-semibold text-white shadow-xs hover:bg-blue-700"
						>
							{isSaving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
