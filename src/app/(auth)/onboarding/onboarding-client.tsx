"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, MailPlus } from "@/components/icons";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from "@/components/auth/auth-ui-utils";
import { checkDomain, createDomain, createMailbox, getDomains } from "./utils";
import type { DomainPreflight } from "./types";

export function OnboardingClient() {
	const router = useRouter();
	const [step, setStep] = useState<1 | 2>(1);
	const [hostname, setHostname] = useState("");
	const [domainCheck, setDomainCheck] = useState<DomainPreflight | null>(null);
	const [domainChecking, setDomainChecking] = useState(false);
	const [enableSending, setEnableSending] = useState(false);
	const [skipDns, setSkipDns] = useState(false);
	const [domainId, setDomainId] = useState("");
	const [localPart, setLocalPart] = useState("me");
	const [error, setError] = useState<string | null>(null);
	const [mxConflict, setMxConflict] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		void getDomains()
			.then((data) => {
				const primary = data.domains?.[0];
				if (!primary) return;
				setDomainId(primary.id);
				setHostname(primary.hostname);
				setStep(2);
			})
			.catch(() => undefined);
	}, []);

	async function addDomain(replaceMxRecords = false) {
		setLoading(true);
		setError(null);

		const normalized = hostname.toLowerCase().trim();
		let checkedDomain = domainCheck;
		let sendingRequested = enableSending;
		if (skipDns) {
			checkedDomain = { hostname: normalized, zone: { id: "manual", name: normalized } };
		} else if (checkedDomain?.hostname !== normalized) {
			const result = await checkDomain(normalized);
			if (!result.ok || !result.domain) {
				setLoading(false);
				setError(result.error ?? "Domain check failed");
				return;
			}
			checkedDomain = result.domain;
			sendingRequested = false;
			setDomainCheck(result.domain);
			setEnableSending(sendingRequested);
		}
		if (!checkedDomain) {
			setLoading(false);
			setError("Domain check failed");
			return;
		}

		const { ok, data } = await createDomain(checkedDomain.hostname, skipDns ? true : sendingRequested, replaceMxRecords, skipDns);
		setLoading(false);
		if (!ok || !data.domain) {
			if (data.code === "MX_RECORDS_CONFLICT") {
				setMxConflict(true);
				setError(null);
				return;
			}
			setError(data.error ?? "Failed to add domain");
			return;
		}
		setMxConflict(false);
		setDomainId(data.domain.id);
		setStep(2);
	}

	async function inspectDomain() {
		const normalized = hostname.toLowerCase().trim();
		if (skipDns || normalized.length < 3 || domainCheck?.hostname === normalized) return;

		setDomainChecking(true);
		setError(null);
		setMxConflict(false);
		const result = await checkDomain(normalized);
		setDomainChecking(false);
		if (!result.ok || !result.domain) {
			setDomainCheck(null);
			setEnableSending(false);
			setError(result.error ?? "Domain check failed");
			return;
		}

		setDomainCheck(result.domain);
		setEnableSending(false);
	}

	async function addMailbox() {
		setLoading(true);
		setError(null);

		const { ok, data } = await createMailbox(domainId, localPart);
		setLoading(false);
		if (!ok) {
			setError(data.error ?? "Failed to create mailbox");
			return;
		}
		router.push("/inbox");
	}

	return (
		<AuthShell
			icon={MailPlus}
			title={step === 1 ? "Add your domain" : "Create your first email address"}
			description={
				step === 1
					? "Add the domain your email will use."
					: "Pick the address you'll use first. You can add more later."
			}
			steps={[
				{ label: "Domain", active: step === 1 },
				{ label: "Email address", active: step === 2 },
			]}
			footer={
				<span className="inline-flex items-center gap-2 text-neutral-500">
					Setup completes in the inbox
					<ArrowRight className="h-4 w-4" />
				</span>
			}
		>
			<div className="space-y-5">
				{step === 1 && (
					<>
						<p className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-blue-900">
							The domain must be in the Cloudflare account this server is connected to.
						</p>
						<div className="space-y-1.5">
							<Label htmlFor="domain" className={AUTH_LABEL_CLASS}>Domain name</Label>
							<Input
								id="domain"
								value={hostname}
								onChange={(e) => {
									setHostname(e.target.value);
									if (domainCheck?.hostname !== e.target.value.toLowerCase().trim()) {
										setDomainCheck(null);
										setEnableSending(false);
										setMxConflict(false);
									}
								}}
								onBlur={() => void inspectDomain()}
								placeholder="example.com"
								className={AUTH_INPUT_CLASS}
							/>
						</div>
						<div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
							<div>
								<Label htmlFor="onboarding-skip-dns" className="text-xs font-semibold uppercase tracking-wider text-slate-700">Set up later</Label>
								<p className="mt-1 text-xs leading-5 text-neutral-500">
									{skipDns ? "We won't change your domain's settings. Email won't work until you set them up." : "Add the domain now and connect it later."}
								</p>
							</div>
							<Switch
								id="onboarding-skip-dns"
								checked={skipDns}
								onCheckedChange={(checked) => {
									setSkipDns(checked);
									setMxConflict(false);
									setError(null);
								}}
							/>
						</div>
						{!skipDns && (
						<div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
							<div>
								<Label htmlFor="onboarding-enable-sending" className="text-xs font-semibold uppercase tracking-wider text-slate-700">Send email too</Label>
								<p className="mt-1 text-xs leading-5 text-neutral-500">
									{domainChecking
										? "Checking your domain..."
										: domainCheck
											? enableSending
												? "You can send and receive."
												: "You can receive only."
											: "Enter your domain first."}
								</p>
							</div>
							{domainChecking ? (
								<LoaderCircle className="h-4 w-4 animate-spin text-neutral-500" />
							) : (
								<Switch
									id="onboarding-enable-sending"
									checked={enableSending}
									onCheckedChange={setEnableSending}
									disabled={!domainCheck || skipDns}
								/>
							)}
						</div>
						)}
						{domainCheck && !skipDns && (
							<div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
								<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								{`${domainCheck.zone.name} is ready to connect`}
							</div>
						)}
						{mxConflict && (
							<div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
								<div className="flex items-start gap-3">
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
									<p className="text-xs leading-5">
										This domain already gets email somewhere else. If you continue, new email will come here instead and your old provider will stop receiving it.
									</p>
								</div>
								<Button
									onClick={() => void addDomain(true)}
									disabled={loading}
									className={AUTH_PRIMARY_BUTTON_CLASS}
								>
									{loading ? "Switching..." : "Switch my email here"}
								</Button>
							</div>
						)}
						{!mxConflict && (
							<Button
								onClick={() => void addDomain()}
								disabled={!hostname || loading || domainChecking}
								className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
							>
								{loading ? "Adding..." : "Add domain"}
							</Button>
						)}
					</>
				)}
				{step === 2 && (
					<>
						<div className="space-y-1.5">
							<Label htmlFor="localPart" className={AUTH_LABEL_CLASS}>Mailbox address</Label>
							<div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs transition-all hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
								<input
									id="localPart"
									value={localPart}
									onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
									placeholder="me, hello, support"
									className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
								/>
								<span className="flex max-w-[55%] items-center truncate border-l border-slate-200 bg-slate-50 px-3.5 font-mono text-xs font-semibold text-slate-600">
									@{hostname}
								</span>
							</div>
						</div>
						<Button
							onClick={addMailbox}
							disabled={!localPart || loading}
							className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
						>
							{loading ? "Creating inbox..." : "Go to inbox (1 GB Dedicated)"}
						</Button>
					</>
				)}
				{error && (
					<p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
						{error}
					</p>
				)}
			</div>
		</AuthShell>
	);
}
