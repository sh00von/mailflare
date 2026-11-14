"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { AtSign, Ban, ChevronRight, CornerDownRight, HardDrive } from "@/components/icons";
import { MailboxSignatureForm } from "./mailbox-signature-form";
import { ProfileForm } from "./profile-form";
import { TimeZoneForm } from "./time-zone-form";
import type { AccountSettingsResponse } from "./types";
import { loadAccountSettings } from "./utils";

export function AccountSettings() {
	const [user, setUser] = useState<AccountSettingsResponse["user"]>();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		loadAccountSettings()
			.then((nextUser) => {
				if (!cancelled) setUser(nextUser);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load account");
			});

		return () => {
			cancelled = true;
		};
	}, []);

	if (error) {
		return <p role="alert" className="py-8 text-sm text-red-600">{error}</p>;
	}

	if (!user) {
		return (
			<div className="space-y-6 py-4">
				<div>
					<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Account</h1>
					<p className="mt-1 text-sm text-neutral-500">Manage your account details, signature, and time zone.</p>
				</div>
				<Skeleton className="h-72 w-full rounded-3xl" />
			</div>
		);
	}

	return (
		<div className="space-y-8 py-4">
			<div>
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">Account</h1>
				<p className="mt-1 text-sm text-neutral-500">Manage your account details, signature, and time zone.</p>
			</div>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Account details</h2>
					<p className="mt-1 text-sm text-neutral-500">Manage your identity, recovery options, and email preferences.</p>
				</div>
				<div className="space-y-1 overflow-hidden rounded-3xl">
					<ProfileForm
						accountName={user.name}
						initialResetEmail={user.resetEmail ?? ""}
					/>

					<div className="space-y-4 rounded-b-3xl rounded-t-lg bg-white p-6">
						<div>
							<h3 className="text-lg font-semibold text-neutral-900">Mailbox identity & signature</h3>
							<p className="mt-1 text-sm text-neutral-500">Configure your display name, default sending address, and email signature for the active inbox.</p>
						</div>
					<MailboxSignatureForm />
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">Mailbox Controls</h2>
					<p className="mt-1 text-sm text-neutral-500">Manage extra receiving addresses, auto-forwarding, storage quota, and sender blocking.</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Link
						href="/settings/aliases"
						className="group flex items-center justify-between rounded-3xl bg-white p-6 transition-all duration-150 hover:shadow-xs hover:border-neutral-300 border border-neutral-200/80 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100/80">
								<AtSign className="h-5 w-5" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">Email Aliases</h3>
								<p className="mt-0.5 text-xs text-neutral-500">Add alternate addresses to your inbox</p>
							</div>
						</div>
						<ChevronRight className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-700" />
					</Link>
					<Link
						href="/settings/forwarding"
						className="group flex items-center justify-between rounded-3xl bg-white p-6 transition-all duration-150 hover:shadow-xs hover:border-neutral-300 border border-neutral-200/80 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-100/80">
								<CornerDownRight className="h-5 w-5" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">Email Forwarding</h3>
								<p className="mt-0.5 text-xs text-neutral-500">Auto-forward mail to external addresses</p>
							</div>
						</div>
						<ChevronRight className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-700" />
					</Link>
					<Link
						href="/settings/storage"
						className="group flex items-center justify-between rounded-3xl bg-white p-6 transition-all duration-150 hover:shadow-xs hover:border-neutral-300 border border-neutral-200/80 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100/80">
								<HardDrive className="h-5 w-5" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">Storage & Quota</h3>
								<p className="mt-0.5 text-xs text-neutral-500">Check capacity and attachment usage</p>
							</div>
						</div>
						<ChevronRight className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-700" />
					</Link>
					<Link
						href="/settings/blocklist"
						className="group flex items-center justify-between rounded-3xl bg-white p-6 transition-all duration-150 hover:shadow-xs hover:border-neutral-300 border border-neutral-200/80 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition-colors group-hover:bg-red-100/80">
								<Ban className="h-5 w-5" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-neutral-900">Blocked Senders</h3>
								<p className="mt-0.5 text-xs text-neutral-500">Block spammers and unwanted mail</p>
							</div>
						</div>
						<ChevronRight className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-700" />
					</Link>
				</div>
			</section>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">General</h2>
					<p className="mt-1 text-sm text-neutral-500">Time zone for your account.</p>
				</div>
				<div className="overflow-hidden rounded-3xl">
					<TimeZoneForm userId={user.id} initialTimeZone={user.timeZone} />
				</div>
			</section>
		</div>
	);
}
