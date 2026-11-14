"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Copy, Info, LoaderCircle, MailPlus, RefreshCw } from "@/components/icons";
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
import { CaptchaField } from "@/components/auth/captcha-field";
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
	const [captchaReset, setCaptchaReset] = useState(0);

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
				setError(typeof data.error === "string" ? data.error : "Could not check your domain. Try again.");
				return;
			}
			setDnsChecklist(data.requiredRecords ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not check your domain. Try again.");
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
				skipDns: !allDnsVerified,
			});
			if (!ok) {
				setError(
					typeof data.error === "string"
						? data.error
						: "Registration failed",
				);
				setCaptchaReset((v) => v + 1);
				return;
			}
			window.location.assign(data.redirect ?? "/admin/domains");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
			setCaptchaReset((v) => v + 1);
		} finally {
			setLoading(false);
		}
	}

	const stepTitle =
		step === 1
			? "Get started"
			: step === 2
				? `Set up ${domainName}`
				: "Create your account";

	const stepSubtitle =
		step === 1
			? "Enter your company's domain. Your team's email addresses will use it."
			: step === 2
				? "Copy these settings into the website where you bought your domain. This is what makes your email work."
				: `Pick your email address at ${domainName}.`;

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
				{ label: "Your domain", active: step === 1, done: step > 1 },
				{ label: "Connect it", active: step === 2, done: step > 2 },
				{ label: "Your account", active: step === 3 },
			]}
		>
			{!ready ? (
				<div className="flex items-center justify-center gap-3 py-8 text-sm text-neutral-500">
					<LoaderCircle className="h-4 w-4 animate-spin" />
					Preparing workspace...
				</div>
			) : step === 1 ? (
				<form onSubmit={onDomainStepSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="orgName" className={AUTH_LABEL_CLASS}>
							Company name <span className="font-normal text-neutral-500">(optional)</span>
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
						<Label htmlFor="domain" className={AUTH_LABEL_CLASS}>Company domain</Label>
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
							{loading ? "Checking..." : "Next"}
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
								: "Sign in where you bought your domain (GoDaddy, Namecheap, Cloudflare…), add each setting below, then press Check again. It can take a few minutes to show up."}
						</span>
					</div>

					{dnsChecking && dnsChecklist.length === 0 ? (
						<div className="flex items-center gap-2 py-6 text-sm text-neutral-500">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							Checking {domainName}...
						</div>
					) : (
						<ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-300">
							{dnsChecklist.map((rec, i) => (
								<li key={`${rec.type}-${rec.name}-${i}`} className="space-y-2.5 p-4">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-700">{rec.type}</span>
										<span className="text-sm text-neutral-500">
											Name <code className="font-mono text-neutral-900">{rec.name}</code>
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
							<Button type="button" className={AUTH_PRIMARY_BUTTON_CLASS} onClick={() => setStep(3)}>
								Next
							</Button>
						</div>
					</div>
					<div className="flex flex-col items-center gap-1.5 pt-1 text-center">
						<button
							type="button"
							onClick={() => setStep(3)}
							className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
						>
							I&apos;ll configure DNS later (Skip this step) &rarr;
						</button>
						<p className="text-[11px] text-neutral-400">
							DNS propagation may take a few minutes. You can access your account right away.
						</p>
					</div>
				</div>
			) : (
				<form method="post" onSubmit={onAccountSubmit} className="space-y-6">
					<div className="space-y-1.5">
						<Label htmlFor="username" className={AUTH_LABEL_CLASS}>Your email address</Label>
						<div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs transition-all hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
							<input
								id="username"
								name="username"
								placeholder="you"
								autoComplete="username"
								autoCapitalize="none"
								spellCheck={false}
								required
								autoFocus
								className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
							/>
							<span className="flex max-w-[55%] items-center truncate border-l border-slate-200 bg-slate-50 px-3.5 font-mono text-xs font-semibold text-slate-600">
								@{domainName}
							</span>
						</div>
					</div>
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
					<CaptchaField resetSignal={captchaReset} />
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
