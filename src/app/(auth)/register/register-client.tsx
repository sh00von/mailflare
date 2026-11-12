"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Copy, Info, KeyRound, LoaderCircle, MailPlus, RefreshCw } from "@/components/icons";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
	AUTH_ERROR_CLASS,
	AUTH_INPUT_CLASS,
	AUTH_LABEL_CLASS,
	AUTH_PRIMARY_BUTTON_CLASS,
	AUTH_SECONDARY_BUTTON_CLASS,
	AUTH_TEXT_BUTTON_CLASS,
} from "@/components/auth/auth-ui-utils";
import { PasswordInput } from "@/components/auth/password-input";
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
				orgName: orgName.trim() || undefined,
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
			? "Create your workspace"
			: step === 2
				? `Connect ${domainName}`
				: "Create your admin account";

	const stepSubtitle =
		step === 1
			? "Pick a plan and enter your business domain. Every plan starts with a 14-day free trial."
			: step === 2
				? "Add these DNS records at your domain registrar so your team can send and receive mail."
				: `Choose your first email address on ${domainName}.`;

	const allDnsVerified = dnsChecklist.length > 0 && dnsChecklist.every((rec) => rec.added);
	const errorBox = error && (
		<p role="alert" className={AUTH_ERROR_CLASS}>
			<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
			{error}
		</p>
	);

	return (
		<AuthShell
			icon={MailPlus}
			title={stepTitle}
			description={stepSubtitle}
			wide={step === 2}
			steps={[
				{ label: "Plan and domain", active: step === 1, done: step > 1 },
				{ label: "Connect DNS", active: step === 2, done: step > 2 },
				{ label: "Admin account", active: step === 3 },
			]}
		>
			{!ready ? (
				<div className="flex items-center justify-center gap-3 py-8 text-sm text-neutral-500">
					<LoaderCircle className="h-4 w-4 animate-spin" />
					Preparing workspace...
				</div>
			) : step === 1 ? (
				<form onSubmit={onDomainStepSubmit} className="space-y-6">
					<fieldset className="space-y-3">
						<legend className={`${AUTH_LABEL_CLASS} mb-3`}>Plan</legend>
						<div role="radiogroup" aria-label="Plan" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							{PLAN_LIST.map((item) => {
								const active = plan === item.id;
								return (
									<button
										key={item.id}
										type="button"
										role="radio"
										aria-checked={active}
										onClick={() => setPlan(item.id)}
										className={`relative rounded-xl border p-4 text-left transition ${
											active
												? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
												: "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
										}`}
									>
										<span className="flex items-center justify-between gap-2">
											<span className="text-sm font-medium text-neutral-900">{item.name}</span>
											<span
												aria-hidden="true"
												className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${active ? "border-blue-600" : "border-neutral-400"}`}
											>
												{active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
											</span>
										</span>
										<span className="mt-2 block">
											<span className="text-xl font-normal text-neutral-900">${item.priceMonthlyUsd}</span>
											<span className="text-xs text-neutral-500"> / month</span>
										</span>
										<span className="mt-1.5 block text-xs leading-5 text-neutral-500">
											{item.maxDomains} {item.maxDomains === 1 ? "domain" : "domains"} · {item.maxMailboxes} mailboxes · {item.storageLabel}
										</span>
									</button>
								);
							})}
						</div>
					</fieldset>
					<div className="space-y-2">
						<Label htmlFor="orgName" className={AUTH_LABEL_CLASS}>
							Business name <span className="font-normal text-neutral-500">(optional)</span>
						</Label>
						<Input
							id="orgName"
							placeholder="Acme Inc."
							autoComplete="organization"
							className={AUTH_INPUT_CLASS}
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain" className={AUTH_LABEL_CLASS}>Business domain</Label>
						<Input
							id="domain"
							name="domain"
							placeholder="yourcompany.com"
							autoComplete="off"
							autoCapitalize="none"
							spellCheck={false}
							inputMode="url"
							required
							className={AUTH_INPUT_CLASS}
							value={domainName}
							onChange={(e) => setDomainName(e.target.value)}
							aria-describedby="domain-hint"
						/>
						<p id="domain-hint" className="text-sm leading-6 text-neutral-500">
							Your team’s addresses will look like{" "}
							<span className="font-medium text-neutral-700">you@{domainName.trim() || "yourcompany.com"}</span>
						</p>
					</div>
					{errorBox}
					<div className="flex items-center justify-between gap-3 pt-2">
						<Link href="/login" className={AUTH_TEXT_BUTTON_CLASS}>
							Sign in instead
						</Link>
						<Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
							{loading ? "Checking domain..." : "Next"}
						</Button>
					</div>
				</form>
			) : step === 2 ? (
				<div className="space-y-5">
					<div
						role="status"
						className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
							allDnsVerified ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
						}`}
					>
						{allDnsVerified ? (
							<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
						) : (
							<Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
						)}
						<span>
							{allDnsVerified
								? `All records found for ${domainName}. You can continue.`
								: "Add the records below at your registrar (Namecheap, GoDaddy, Cloudflare…), then check again. Changes can take a few minutes to appear."}
						</span>
					</div>

					{dnsChecking && dnsChecklist.length === 0 ? (
						<div className="flex items-center gap-2 py-6 text-sm text-neutral-500">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							Checking live DNS for {domainName}...
						</div>
					) : (
						<ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-300">
							{dnsChecklist.map((rec, i) => (
								<li key={`${rec.type}-${rec.name}-${i}`} className="space-y-2.5 p-4">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-700">{rec.type}</span>
										<span className="text-sm text-neutral-500">
											Host <code className="font-mono text-neutral-900">{rec.name}</code>
											{rec.priority !== undefined ? ` · Priority ${rec.priority}` : ""}
										</span>
										<span
											className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
												rec.added ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
											}`}
										>
											{rec.added ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
											{rec.added ? "Found" : "Not found yet"}
										</span>
									</div>
									<div className="flex items-center gap-2 rounded-lg bg-neutral-50 py-1.5 pl-3 pr-1.5">
										<code className="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-neutral-700">{rec.value}</code>
										<button
											type="button"
											onClick={() => {
												void navigator.clipboard.writeText(rec.value);
												setCopiedIdx(i);
												setTimeout(() => setCopiedIdx(null), 1500);
											}}
											className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
											aria-label={`Copy ${rec.type} value`}
										>
											{copiedIdx === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
											{copiedIdx === i ? "Copied" : "Copy"}
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
					{errorBox}
					<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
						<button type="button" className={AUTH_TEXT_BUTTON_CLASS} onClick={() => setStep(1)}>
							Back
						</button>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								className={AUTH_SECONDARY_BUTTON_CLASS}
								disabled={dnsChecking}
								onClick={() => void loadDnsChecklist(domainName)}
							>
								<RefreshCw className={`h-4 w-4 ${dnsChecking ? "animate-spin" : ""}`} />
								{dnsChecking ? "Checking..." : "Check again"}
							</Button>
							<Button type="button" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={!allDnsVerified || dnsChecking} onClick={() => setStep(3)}>
								Next
							</Button>
						</div>
					</div>
				</div>
			) : (
				<form method="post" onSubmit={onAccountSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="username" className={AUTH_LABEL_CLASS}>Your email address</Label>
						<div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-400 bg-white transition hover:border-neutral-700 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
							<input
								id="username"
								name="username"
								placeholder="you"
								autoComplete="username"
								autoCapitalize="none"
								spellCheck={false}
								required
								autoFocus
								className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base outline-none placeholder:text-neutral-400"
							/>
							<span className="flex max-w-[55%] items-center truncate border-l border-neutral-200 bg-neutral-50 px-4 text-base text-neutral-500">
								@{domainName}
							</span>
						</div>
					</div>
					<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 px-4 py-3.5 transition hover:bg-neutral-50">
						<Checkbox
							name="usePasskey"
							checked={usePasskey}
							onChange={(event) => setUsePasskey(event.target.checked)}
							className="mt-1"
						/>
						<span>
							<span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
								<KeyRound className="h-4 w-4 text-blue-600" />
								Use a passkey instead of a password
							</span>
							<span className="mt-1 block text-sm leading-6 text-neutral-500">
								Sign in with your fingerprint, face or device PIN. You’ll create it on the next step.
							</span>
						</span>
					</label>
					{!usePasskey && (
						<div className="space-y-2">
							<Label htmlFor="password" className={AUTH_LABEL_CLASS}>Password</Label>
							<PasswordInput
								id="password"
								name="password"
								minLength={8}
								autoComplete="new-password"
								aria-describedby="password-hint"
								required
							/>
							<p id="password-hint" className="text-sm text-neutral-500">Use 8 or more characters.</p>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="resetEmail" className={AUTH_LABEL_CLASS}>Recovery email</Label>
						<Input
							id="resetEmail"
							name="resetEmail"
							type="email"
							autoComplete="email"
							placeholder="you@gmail.com"
							className={AUTH_INPUT_CLASS}
							aria-describedby="recovery-hint"
							required
						/>
						<p id="recovery-hint" className="text-sm text-neutral-500">We’ll send password reset links here.</p>
					</div>
					<TurnstileField resetSignal={turnstileReset} />
					{errorBox}
					<div className="flex items-center justify-between gap-3 pt-2">
						<button type="button" className={AUTH_TEXT_BUTTON_CLASS} onClick={() => setStep(2)}>
							Back
						</button>
						<Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={loading}>
							{loading ? "Creating workspace..." : "Create workspace"}
						</Button>
					</div>
				</form>
			)}
		</AuthShell>
	);
}
