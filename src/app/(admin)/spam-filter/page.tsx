"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SpamFilterSettingsResponse } from "./types";
import { formatBrandLines, loadSpamFilterSettings, parseBrandLines, saveSpamFilterSettings } from "./utils";

/** Admin settings for the spam filter's internal Rspamd engine, RDAP domain age checks, and brand protection. */
export default function SpamFilterSettingsPage() {
	const [settings, setSettings] = useState<SpamFilterSettingsResponse | null>(null);
	const [loadError, setLoadError] = useState("");
	const [brandText, setBrandText] = useState("");
	const [brandSaving, setBrandSaving] = useState(false);
	const [ageSaving, setAgeSaving] = useState(false);
	const [checkingRspamd, setCheckingRspamd] = useState(false);

	const refreshSettings = async () => {
		try {
			setCheckingRspamd(true);
			const data = await loadSpamFilterSettings();
			setSettings(data);
			setBrandText(formatBrandLines(data.brands));
			setLoadError("");
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : "Could not load spam filter settings.");
		} finally {
			setCheckingRspamd(false);
		}
	};

	useEffect(() => {
		void refreshSettings();
	}, []);

	const editable = Boolean(settings?.available);
	const parsedBrands = parseBrandLines(brandText);

	async function saveBrands(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (parsedBrands.invalidLines.length) return;
		setBrandSaving(true);
		try {
			const data = await saveSpamFilterSettings({ brands: parsedBrands.brands });
			setSettings(data);
			setBrandText(formatBrandLines(data.brands));
			notify.success("Brands saved successfully");
		} catch (error) {
			notify.error(error, "Could not save spam filter settings");
		} finally {
			setBrandSaving(false);
		}
	}

	function toggleDomainAge(checked: boolean) {
		setAgeSaving(true);
		void saveSpamFilterSettings({ domainAge: checked })
			.then(setSettings)
			.catch((error) => notify.error(error, "Could not save spam filter settings"))
			.finally(() => setAgeSaving(false));
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-medium text-neutral-900">Spam filter</h1>
				<p className="mt-2 text-sm text-neutral-500">
					Internal Rspamd inspection, domain reputation, and brand impersonation protection for incoming mail.
				</p>
			</div>

			{loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
			{settings && !settings.available && (
				<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
					Apply the pending database update on the admin overview before changing these settings.
				</p>
			)}

			{/* Rspamd Spam Engine Card */}
			<Card className="rounded-3xl border-0 bg-white p-6 shadow-xs">
				<CardHeader className="py-0">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<CardTitle className="text-lg font-semibold">Rspamd Spam Engine</CardTitle>
								{settings?.rspamd.online ? (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
										<CheckCircle2 className="w-3.5 h-3.5" />
										Connected {settings.rspamd.latencyMs !== undefined ? `(${settings.rspamd.latencyMs}ms)` : ""}
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
										<AlertCircle className="w-3.5 h-3.5" />
										Offline / Fallback mode
									</span>
								)}
							</div>
							<CardDescription className="text-sm text-neutral-500">
								Dedicated internal content inspection engine. External third-party API keys (Spamhaus, abuse.ch) are purged in favor of local scoring.
							</CardDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void refreshSettings()}
							disabled={checkingRspamd}
							className="self-start sm:self-auto gap-1.5"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${checkingRspamd ? "animate-spin" : ""}`} />
							Check connection
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
							<p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Endpoint URL</p>
							<p className="font-mono text-sm text-neutral-800 break-all">{settings?.rspamd.url || "http://rspamd:11333"}</p>
							<p className="text-xs text-neutral-400">Configured via RSPAMD_URL environment variable.</p>
						</div>
						<div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
							<p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Fail-Safe Resilience</p>
							<p className="text-sm text-neutral-700">
								{settings?.rspamd.online
									? "Evaluating inbound raw MIME against spam symbols, fuzzy hash signatures, and neural models."
									: "Rspamd service is unreachable. Mailflare automatically falls back to native Bayesian & heuristic classification."}
							</p>
						</div>
					</div>

					<div className="border-t border-neutral-100 pt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
						<div className="flex items-center gap-1.5">
							<ShieldAlert className="w-4 h-4 text-rose-500" />
							<span><strong>Reject threshold:</strong> Score ≥ 14.0 (bounced)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<AlertCircle className="w-4 h-4 text-amber-500" />
							<span><strong>Spam threshold:</strong> Score ≥ 6.0 (filed to Spam)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<ShieldCheck className="w-4 h-4 text-emerald-500" />
							<span><strong>Inbox threshold:</strong> Score &lt; 6.0 (delivered)</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Domain Age Check */}
			<Card className="rounded-3xl border-0 bg-white p-6 shadow-xs">
				<CardContent className="flex items-center justify-between gap-4 p-0">
					<div>
						<p className="font-medium text-neutral-900">Domain age check (RDAP)</p>
						<p className="mt-1 text-sm text-neutral-500">
							Looks up when sender and link domains were registered. Domains younger than a month raise the spam score without requiring external API keys.
						</p>
						{settings?.domainAgeForcedOff && (
							<p className="mt-1 text-sm text-amber-700">Turned off by SPAM_DOMAIN_AGE_CHECK=off.</p>
						)}
					</div>
					<Switch
						checked={Boolean(settings?.domainAge && !settings.domainAgeForcedOff)}
						disabled={!editable || ageSaving || settings?.domainAgeForcedOff}
						onCheckedChange={toggleDomainAge}
						aria-label={"Domain age check"}
					/>
				</CardContent>
			</Card>

			{/* Brand Impersonation Protection */}
			<Card className="rounded-3xl border-0 bg-white p-6 shadow-xs">
				<CardHeader className="py-0">
					<CardTitle className="text-lg font-semibold">Protected Brands</CardTitle>
					<CardDescription className="text-sm text-neutral-500">
						A sender display name that claims one of these brands but originates from an unauthorized domain triggers immediate impersonation penalties.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<form onSubmit={saveBrands} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="spam-brands">Your custom brands</Label>
							<Textarea
								id="spam-brands"
								rows={6}
								value={brandText}
								onChange={(event) => setBrandText(event.target.value)}
								disabled={!editable || brandSaving}
								placeholder={"PostFinance = postfinance.ch\nSwisscom = swisscom.ch, swisscom.com"}
								className="font-mono text-sm rounded-xl"
								aria-describedby="spam-brands-help"
							/>
							<p id="spam-brands-help" className="text-xs text-neutral-500">
								Format: <code>Brand Name = domain.com, other-domain.com</code> (one brand per line). Global brands like Apple, Google, Microsoft, PayPal, Amazon, Netflix, and DHL are already protected by default.
							</p>
							{parsedBrands.invalidLines.length > 0 && (
								<p role="alert" className="text-sm text-red-700">
									{`Line ${parsedBrands.invalidLines.join(", ")}: use the format Brand Name = domain.com.`}
								</p>
							)}
						</div>
						<Button type="submit" disabled={!editable || brandSaving || parsedBrands.invalidLines.length > 0}>
							{brandSaving ? "Saving..." : "Save protected brands"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
