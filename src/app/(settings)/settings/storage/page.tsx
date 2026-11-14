import { MailboxStorageSettings } from "@/components/settings/mailbox-storage-settings";

export default function SettingsStoragePage() {
	return (
		<div className="space-y-6 py-4">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Storage & Quota</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Monitor your mailbox capacity, message footprint, and attachment storage.
				</p>
			</div>
			<MailboxStorageSettings />
		</div>
	);
}
