import { PasswordSettings } from "@/components/settings/password-settings";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { TwoStepSettings } from "@/components/settings/two-step-settings";
import { DeviceSettings } from "@/components/settings/device-settings";

export default async function SecuritySettingsPage() {
	return <div className="space-y-8 py-4">
		<section className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold text-neutral-900">Security</h1>
				<p className="mt-1 text-sm text-neutral-500">Manage how you sign in to your account.</p>
			</div>
			<div className="space-y-6 rounded-3xl bg-white p-6">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">Sign-in methods</h2>
					<p className="mt-1 text-sm text-neutral-500">Choose how you sign in. Passkeys can replace a password or act as a second step.</p>
				</div>
				<div className="space-y-4">
					<h3 className="text-sm font-semibold text-neutral-900">Password</h3>
					<PasswordSettings />
				</div>
				<div id="passkeys" className="scroll-mt-6 space-y-4 border-t border-neutral-100 pt-6">
					<div>
						<h3 className="text-sm font-semibold text-neutral-900">Passkeys</h3>
						<p className="mt-1 text-sm text-neutral-500">Sign in without a password, or use a passkey as a second step after entering your password.</p>
					</div>
					<PasskeySettings />
				</div>
			</div>
			<div className="rounded-3xl bg-white p-6">
				<TwoStepSettings />
			</div>
			<div className="space-y-4 rounded-3xl bg-white p-6">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">Mobile devices</h2>
					<p className="mt-1 text-sm text-neutral-500">Phones and tablets signed in with the Replyot app. Signing a device out stops its mail and notifications. Changing your password signs out every device.</p>
				</div>
				<DeviceSettings />
			</div>
		</section>
	</div>;
}
