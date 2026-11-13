import { PasswordSettings } from "@/components/settings/password-settings";
import { TwoStepSettings } from "@/components/settings/two-step-settings";

export default async function SecuritySettingsPage() {
	return <div className="space-y-8 py-4">
		<section className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold text-neutral-900">Security</h1>
				<p className="mt-1 text-sm text-neutral-500">Manage how you sign in to your account.</p>
			</div>
			<div className="space-y-6 rounded-3xl bg-white p-6">
				<div>
					<h2 className="text-lg font-semibold text-neutral-900">Password</h2>
					<p className="mt-1 text-sm text-neutral-500">Update your account password.</p>
				</div>
				<div className="space-y-4">
					<PasswordSettings />
				</div>
			</div>
			<div className="rounded-3xl bg-white p-6">
				<TwoStepSettings />
			</div>
		</section>
	</div>;
}
