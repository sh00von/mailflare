import { MailboxBlocklistSettings } from "@/components/settings/mailbox-blocklist-settings";

export default function SettingsBlocklistPage() {
	return (
		<div className="space-y-6 py-4">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Blocked Senders</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Prevent unwanted emails and spam by blocking specific addresses or senders.
				</p>
			</div>
			<MailboxBlocklistSettings />
		</div>
	);
}
