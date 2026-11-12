"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, LoaderCircle, MailPlus } from "@/components/icons";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/auth/turnstile";
import {
	checkExistingMx,
	submitPrimaryDomain,
	submitRegistration,
} from "./utils";
import { PLAN_LIST, resolvePlanId, type PlanId } from "@/lib/plans/catalog";
import type { DnsRecordChecklistItem, DomainSetupResult } from "./types";

export function RegisterClient() {
	const [ready] = useState(true);
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [plan, setPlan] = useState<PlanId>("starter");
	const [orgName, setOrgName] = useState("");
	const [domainName, setDomainName] = useState("");
	const [dnsChecklist, setDnsChecklist] = useState<DnsRecordChecklistItem[]>([]);
	const [dnsChecking, setDnsChecking] = useState(false);
	const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [turnstileReset, setTurnstileReset] = useState(0);
	const [usePasskey, setUsePasskey] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const qp = new URLSearchParams(window.location.search).get("plan");
			if (qp) setPlan(resolvePlanId(qp));
		}
	}, []);

	async function loadDnsChecklist(hostname: string) {
		setDnsChecking(true);
		setError(null);
		try {
			const { ok, data } = await checkExistingMx(hostname);
			if (!ok) {
				setError(typeof data.error === "string" ? data.error : "Could not check DNS records");
				return;
			}
			setDnsChecklist(data.requiredRecords ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not check DNS records");
		} finally {
			setDnsChecking(false);
		}
	}

	async function onDomainStepSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const cleanDomain = domainName.toLowerCase().trim();
		if (!cleanDomain) return;
		setLoading(true);
		setError(null);
		try {
			const { ok, data } = (await submitPrimaryDomain(cleanDomain)) as { ok: boolean; data: DomainSetupResult };
			if (!ok || !data.domain) {
				setError(typeof data.error === "string" ? data.error : "Please enter a valid, unregistered domain name");
				return;
			}
			setDomainName(data.domain.hostname);
			setStep(2);
			void loadDnsChecklist(data.domain.hostname);
		} finally {
			setLoading(false);
		}
	}

	async function onAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		setError(null);

		try {
			const { ok, data } = await submitRegistration(formData, {
				firstRun: true,
				domain: domainName,
				plan,
				enableSending: true,
				skipDns: false,
			});
			if (!ok) {
				setError(
					data.code === "passkey_unavailable"
						? "Passkey sign-in is unavailable."
						: typeof data.error === "string"
							? data.error
							: "Registration failed",
				);
				setTurnstileReset((v) => v + 1);
				return;
			}
			window.location.assign(data.redirect ?? "/domains");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
			setTurnstileReset((v) => v + 1);
		} finally {
			setLoading(false);
		}
	}

	const stepTitle =
		step === 1
			? "Set up your business domain"
			: step === 2
				? `Connect ${domainName}`
				: "Create your admin account";

	const stepSubtitle =
		step === 1
			? "Enter your organization and custom domain to launch your free email & workspace."
			: step === 2
				? "Add these DNS records at your domain registrar so you can send and receive mail."
				: `Create your first email address on ${domainName}.`;

	return (
		<AuthShell
			icon={MailPlus}
			title={stepTitle}
			description={stepSubtitle}
			steps={["1 Domain", "2 Connect DNS", "3 Account"]}
			currentStep={step}
			footer={
				<Link href="/login" className="hover:underline">
					Already have a workspace? Sign in
				</Link>
			}
		>
			{!ready ? (
				<div className="flex items-center justify-center gap-3 py-8 text-sm text-neutral-500">
					<LoaderCircle className="h-4 w-4 animate-spin" />
					Preparing workspace...
				</div>
			) : step === 1 ? (
				<form onSubmit={onDomainStepSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Select your plan (14-day free trial)</Label>
						<div className="grid grid-cols-3 gap-2">
							{PLAN_LIST.map((item) => {
								const active = plan === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setPlan(item.id)}
										className={`rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600" : "border-neutral-200 bg-white hover:border-neutral-300"}`}
									>
										<div className="text-xs font-semibold text-neutral-900">{item.name}</div>
										<div className="text-xs text-neutral-600">${item.priceMonthlyUsd}/mo</div>
										<div className="mt-0.5 text-[10px] text-neutral-500">
											{item.maxDomains}d · {item.maxMailboxes}u · {item.storageLabel}
										</div>
									</button>
								);
							})}
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="orgName">Organization / Business name (optional)</Label>
						<Input
							id="orgName"
							placeholder="Ordify Inc."
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain">Your custom domain</Label>
						<Input
							id="domain"
							name="domain"
							placeholder="ordify.site"
							autoComplete="off"
							required
							value={domainName}
							onChange={(e) => setDomainName(e.target.value)}
						/>
						<p className="text-xs leading-5 text-neutral-500">
							Your team email addresses will end with @{domainName.trim() || "yourdomain.com"}.
						</p>
					</div>
					{error && (
						<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
							{error}
						</p>
					)}
					<Button type="submit" className="h-11 w-full rounded-full px-6" disabled={loading}>
						{loading ? "Checking domain..." : "Continue"}
					</Button>
				</form>
			) : step === 2 ? (
				<div className="space-y-4">
					<div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
						<div className="mb-2 flex items-center justify-between gap-2">
							<span className="text-sm font-semibold text-neutral-900">Required DNS records</span>
							<button
								type="button"
								onClick={() => void loadDnsChecklist(domainName)}
								disabled={dnsChecking}
								className="cursor-pointer text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
							>
								{dnsChecking ? "Checking..." : "Re-check DNS"}
							</button>
						</div>
						<p className="mb-3 text-xs text-neutral-500">
							Open your DNS provider (Namecheap, GoDaddy, Route53, etc.) and add these records:
						</p>
						{dnsChecking && dnsChecklist.length === 0 ? (
							<div className="flex items-center gap-2 py-4 text-xs text-neutral-500">
								<LoaderCircle className="h-4 w-4 animate-spin" />
								Checking live DNS for {domainName}...
							</div>
						) : (
							<div className="space-y-2">
								{dnsChecklist.map((rec, i) => (
									<div key={`${rec.type}-${rec.name}-${i}`} className="rounded-xl border border-neutral-200 bg-white p-3 text-xs">
										<div className="flex items-center justify-between gap-2">
											<span className="font-semibold text-neutral-900">
												{rec.type} &middot; Host: <code>{rec.name}</code>
												{rec.priority !== undefined ? ` (Priority ${rec.priority})` : ""}
											</span>
											<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${rec.added ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
												{rec.added ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
												{rec.added ? "Added" : "To Add"}
											</span>
										</div>
										<div className="mt-1.5 flex items-center justify-between gap-2">
											<code className="break-all text-neutral-600">{rec.value}</code>
											<button
												type="button"
												onClick={() => {
													void navigator.clipboard.writeText(rec.value);
													setCopiedIdx(i);
													setTimeout(() => setCopiedIdx(null), 1500);
												}}
												className="shrink-0 cursor-pointer rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
											>
												{copiedIdx === i ? "Copied" : "Copy"}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
					{(() => {
						const allDnsVerified = dnsChecklist.length > 0 && dnsChecklist.every((rec) => rec.added);
						return (
							<>
								<div className={`rounded-2xl border px-4 py-3 text-xs font-medium ${allDnsVerified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
									{allDnsVerified
										? `DNS verified for ${domainName}! You can now create your admin account.`
										: "Waiting for DNS records (MX, SPF, DMARC). Add them at your DNS registrar and click Check DNS again."}
								</div>
								{error && (
									<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
										{error}
									</p>
								)}
								<div className="flex flex-col gap-2 sm:flex-row">
									<Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => setStep(1)}>
										Back
									</Button>
									<Button type="button" variant="outline" className="h-11 rounded-full px-5" disabled={dnsChecking} onClick={() => void loadDnsChecklist(domainName)}>
										{dnsChecking ? "Checking..." : "Check DNS again"}
									</Button>
									<Button type="button" className="h-11 flex-1 rounded-full px-6" disabled={!allDnsVerified || dnsChecking} onClick={() => setStep(3)}>
										Continue to Account Setup
									</Button>
								</div>
							</>
						);
					})()}
				</div>
			) : (
				<form method="post" onSubmit={onAccountSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="username">Your admin email</Label>
						<div className="relative flex items-center">
							<Input
								id="username"
								name="username"
								placeholder="you"
								autoComplete="username"
								required
								className="pr-36"
							/>
							<span className="pointer-events-none absolute right-4 max-w-36 truncate text-sm font-medium text-neutral-500">
								@{domainName}
							</span>
						</div>
					</div>
					<label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
						<Checkbox
							name="usePasskey"
							checked={usePasskey}
							onChange={(event) => setUsePasskey(event.target.checked)}
							className="mt-1"
						/>
						<span>
							<span className="block text-sm font-medium text-neutral-800">Use a passkey instead of a password</span>
							<span className="mt-1 block text-xs leading-5 text-neutral-500">You will create the passkey on the next step. Passkeys use your fingerprint, face, or device PIN and never leave your devices.</span>
						</span>
					</label>
					{!usePasskey && (
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								minLength={8}
								autoComplete="new-password"
								required
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="resetEmail">Recovery email</Label>
						<Input
							id="resetEmail"
							name="resetEmail"
							type="email"
							autoComplete="email"
							placeholder="you@gmail.com"
							required
						/>
					</div>
					<TurnstileField resetTrigger={turnstileReset} />
					{error && (
						<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
							{error}
						</p>
					)}
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => setStep(2)}>
							Back
						</Button>
						<Button type="submit" className="h-11 flex-1 rounded-full px-6" disabled={loading}>
							{loading ? "Creating workspace..." : "Create Workspace"}
						</Button>
					</div>
				</form>
			)}
		</AuthShell>
	);
}
