"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { isHtmlSignature } from "@/components/compose/rich-text-utils";
import { EmailHtmlRenderer } from "@/components/messages/email-html-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateMailboxIdentity } from "./utils";
import { FormSkeleton } from "@/components/page-skeletons";
import { LoaderCircle } from "@/components/icons";

export function MailboxSignatureForm() {
	const { selectedMailbox, setSelectedMailbox, isLoading } = useSelectedMailbox();
	const [displayName, setDisplayName] = useState("");
	const [defaultFrom, setDefaultFrom] = useState("");
	const [signature, setSignature] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (selectedMailbox) {
			setDisplayName(selectedMailbox.displayName ?? "");
			setDefaultFrom(selectedMailbox.defaultFrom ?? "");
			setSignature(selectedMailbox.signature ?? "");
		}
	}, [selectedMailbox?.id, selectedMailbox?.displayName, selectedMailbox?.defaultFrom, selectedMailbox?.signature]);

	if (isLoading) return <FormSkeleton fields={[{ label: "Display name" }, { label: "Default sender" }, { label: "Signature", tall: true }]} />;
	if (!selectedMailbox) return <p className="text-sm text-neutral-500">Select an inbox to configure its identity and signature.</p>;

	const primaryAddress = `${selectedMailbox.localPart}@${selectedMailbox.hostname}`;
	const senderAddresses = selectedMailbox.senderAddresses?.length
		? selectedMailbox.senderAddresses
		: [primaryAddress];
	const canManage = selectedMailbox.permission === "full_access";

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedMailbox) return;
		setSaving(true);
		try {
			const res = await updateMailboxIdentity(selectedMailbox.id, {
				displayName: displayName.trim() || null,
				defaultFrom: defaultFrom.trim() || null,
				signature: signature.trim() || null,
			});
			setDisplayName(res.displayName ?? "");
			setDefaultFrom(res.defaultFrom ?? "");
			setSignature(res.signature ?? "");
			setSelectedMailbox({
				...selectedMailbox,
				displayName: res.displayName,
				defaultFrom: res.defaultFrom,
				signature: res.signature,
			});
			notify.success("Mailbox identity and signature updated");
		} catch (error) {
			notify.error(error, "Could not update mailbox identity");
		} finally {
			setSaving(false);
		}
	}

	const hasChanged =
		(displayName.trim() || "") !== (selectedMailbox.displayName ?? "") ||
		(defaultFrom.trim() || "") !== (selectedMailbox.defaultFrom ?? "") ||
		(signature.trim() || "") !== (selectedMailbox.signature ?? "");

	return (
		<form onSubmit={onSubmit} className="space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="mailboxDisplayName">Display Name (Send As)</Label>
					<Input
						id="mailboxDisplayName"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						placeholder="Your Name (e.g. Alex from Support)"
						disabled={!canManage || saving}
					/>
					<p className="text-xs text-neutral-500">
						Recipients will see this name next to your address when you send emails.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="mailboxDefaultFrom">Default "Send As" Address</Label>
					<Select
						id="mailboxDefaultFrom"
						value={defaultFrom || primaryAddress}
						onChange={(e) => setDefaultFrom(e.target.value)}
						disabled={!canManage || saving}
					>
						{senderAddresses.map((addr) => (
							<option key={addr} value={addr}>
								{addr} {addr === primaryAddress ? "(Primary)" : "(Alias)"}
							</option>
						))}
					</Select>
					<p className="text-xs text-neutral-500">
						Choose which address is selected by default when composing a new message.
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="mailboxSignature">{`Email Signature for ${primaryAddress}`}</Label>
				<Textarea
					id="mailboxSignature"
					value={signature}
					onChange={(event) => setSignature(event.target.value)}
					placeholder={"Best regards,\nYour Name\nCompany / Department"}
					rows={5}
					disabled={!canManage || saving}
				/>
				<p className="text-xs leading-5 text-neutral-500">
					Automatically attached to new messages and replies. Both plain text and HTML are supported.
				</p>
			</div>

			{isHtmlSignature(signature) && (
				<div className="space-y-2">
					<p className="text-xs font-semibold text-neutral-600">Live HTML Preview</p>
					<EmailHtmlRenderer
						className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-sm text-neutral-900"
						html={signature}
					/>
				</div>
			)}

			<div className="flex items-center gap-3 pt-1">
				<Button type="submit" disabled={!canManage || saving || !hasChanged}>
					{saving ? (
						<span className="flex items-center gap-2">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							Saving changes...
						</span>
					) : (
						"Save identity & signature"
					)}
				</Button>
				{!canManage && <p className="text-xs text-neutral-500">Full access is required to edit this mailbox.</p>}
			</div>
		</form>
	);
}
