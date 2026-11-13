import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { InboxThreadingSettings } from "@/components/settings/inbox-threading-settings";
import { RemoteContentSettings } from "@/components/settings/remote-content-settings";
import { RecipientAddressSettings } from "@/components/settings/recipient-address-settings";
import { ComposeDefaultsSettings } from "@/components/settings/compose-defaults-settings";
import { InboxReadingLayoutSettings } from "@/components/settings/inbox-reading-layout-settings";
import { InboxShortcutsSettings } from "@/components/settings/inbox-shortcuts-settings";
import { SpamFilterSettings } from "@/components/settings/spam-filter-settings";
import { TrashRetentionSettings } from "@/components/settings/trash-retention-settings";
import { PushNotificationSettings } from "@/components/settings/push-notification-settings";
import { BrowserNotificationSettings } from "@/components/settings/browser-notification-settings";

export default async function SettingsInboxPage() {
	return (
		<div className="space-y-8 py-4">
			<h1 className="sr-only">Inbox</h1>
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Inbox experience</h2>
					<p className="mt-1 text-sm text-neutral-500">Choose how you read and interact with email.</p>
				</div>
				<div className="divide-y divide-neutral-100 rounded-3xl bg-white p-6">
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Appearance</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose a light or dark interface.</p>
						</div>
						<AppearanceSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Reading layout</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose how open emails appear.</p>
						</div>
						<InboxReadingLayoutSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Threading</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose how emails are organized in your inbox.</p>
						</div>
						<InboxThreadingSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Addresses</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose how recipient addresses appear when you read mail.</p>
						</div>
						<RecipientAddressSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Compose</h3>
							<p className="mt-1 text-sm text-neutral-500">Defaults for new messages. Each message can still change them in the composer.</p>
						</div>
						<ComposeDefaultsSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Shortcuts</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose whether keyboard shortcuts are active.</p>
						</div>
						<InboxShortcutsSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Notifications</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose how you hear about new email.</p>
						</div>
						<BrowserNotificationSettings />
						<div className="mt-4">
							<PushNotificationSettings />
						</div>
					</div>
				</div>
			</section>
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Message handling</h2>
					<p className="mt-1 text-sm text-neutral-500">Manage spam protection, clean-up and automatic replies.</p>
				</div>
				<div className="divide-y divide-neutral-100 rounded-3xl bg-white p-6">
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Spam protection</h3>
							<p className="mt-1 text-sm text-neutral-500">Control local spam analysis for incoming messages.</p>
						</div>
						<SpamFilterSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Remote content</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose when messages may load remote images and styles. Loading them tells the sender you opened the message. Spam always asks first.</p>
						</div>
						<RemoteContentSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-neutral-900">Trash and Spam clean-up</h3>
							<p className="mt-1 text-sm text-neutral-500">Choose how long deleted and spam messages are kept.</p>
						</div>
						<TrashRetentionSettings />
					</div>
				</div>
			</section>
		</div>
	);
}
