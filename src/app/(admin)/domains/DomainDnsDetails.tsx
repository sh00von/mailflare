"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, ShieldCheck, Sparkles, AlertTriangle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { dnsAuthDescriptions, getDnsAuthItemClass } from "./utils";
import { ROW_GRID, StatusBadge } from "./status-row";
import { DomainCatchAllCard } from "./DomainCatchAllCard";
import type { DnsAuthRecord, DomainDnsDetailsProps } from "./types";

function CopyValueButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="h-8 sm:h-7 min-h-[36px] shrink-0 gap-1.5 bg-white px-3 sm:px-2.5 text-xs active:scale-95 transition-[background-color,transform]"
			onClick={() => {
				if (!navigator.clipboard?.writeText) {
					notify.error("Clipboard unavailable in this browser context");
					return;
				}
				void navigator.clipboard.writeText(value).then(() => {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1800);
				}).catch(() => {
					notify.error("Could not copy to clipboard");
				});
			}}
		>
			{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}

export default function DomainDnsDetails({
	domain,
	dns,
	onDnsChanged,
}: DomainDnsDetailsProps) {
	const [checking, setChecking] = useState(false);
	const audit = dns.audit;
	const serverMailHost = (process.env.NEXT_PUBLIC_MAIL_HOSTNAME || `mail.${domain.hostname}`)
		.replace(/^https?:\/\//, "")
		.replace(/\/.*$/, "");
	const mailHost = serverMailHost;

	const expectedValues: Record<DnsAuthRecord, { host: string; type: string; value: string } | null> = {
		mx: { host: "@", type: "MX", value: `10 ${mailHost}.` },
		spf: {
			host: "@",
			type: "TXT",
			value: process.env.NEXT_PUBLIC_SERVER_IP
				? `v=spf1 ip4:${process.env.NEXT_PUBLIC_SERVER_IP} ~all`
				: `v=spf1 a:${mailHost} ~all`,
		},
		dkim: domain.dkimPublicKey
			? {
					host: `${domain.dkimSelector || "default"}._domainkey`,
					type: "TXT",
					value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
			  }
			: process.env.NEXT_PUBLIC_PLATFORM_DKIM_RECORD
			? {
					host: process.env.NEXT_PUBLIC_PLATFORM_DKIM_HOST || "default._domainkey",
					type: "TXT",
					value: process.env.NEXT_PUBLIC_PLATFORM_DKIM_RECORD,
			  }
			: null,
		dmarc: { host: "_dmarc", type: "TXT", value: "v=DMARC1; p=quarantine; pct=100; adkim=r; aspf=r" },
	};

	const mxReady = audit?.mx.status === "ok";
	const outboundActive = domain.status === "active" && domain.sendingEnabled !== false;
	const mailOrigin =
		(typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "");
	const mailUrl = `${mailOrigin}/mail/inbox`;

	const checkList: DnsAuthRecord[] = ["mx", "spf", "dkim", "dmarc"];
	const passedCount = audit
		? checkList.filter((rec) => audit[rec]?.status === "ok").length
		: 0;
	const deliverabilityScore = Math.round((passedCount / checkList.length) * 100);

	return (
		<div className="space-y-5 px-4 pb-5 pt-4 sm:px-5">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
					<div>
						<p className="text-sm font-medium text-neutral-900">Inbound email</p>
						<p className="text-xs text-neutral-500">Handled by Replyot Engine</p>
					</div>
					<span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${mxReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
						{mxReady ? "Active" : "Waiting for MX"}
					</span>
				</div>
				<div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
					<div>
						<p className="text-sm font-medium text-neutral-900">Outbound email</p>
						<p className="text-xs text-neutral-500">Handled by Replyot Engine</p>
					</div>
					<span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${outboundActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
						{outboundActive ? "Active" : "Pending DNS"}
					</span>
				</div>
			</div>

			<DomainCatchAllCard domainId={domain.id} hostname={domain.hostname} />

			{audit && (
				<section className="space-y-4">
					{/* Deliverability Health Score Card */}
					<div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 ${
						deliverabilityScore === 100
							? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
							: deliverabilityScore >= 50
							? "border-blue-200 bg-blue-50/70 text-blue-950"
							: "border-amber-200 bg-amber-50/70 text-amber-950"
					}`}>
						<div className="flex items-center gap-3.5">
							<div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-lg text-white shadow-xs ${
								deliverabilityScore === 100
									? "bg-emerald-600"
									: deliverabilityScore >= 50
									? "bg-blue-600"
									: "bg-amber-600"
							}`}>
								{deliverabilityScore}%
							</div>
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="text-sm font-semibold">
										{deliverabilityScore === 100
											? "Optimal Deliverability • Inbox Ready"
											: deliverabilityScore >= 75
											? "Good Deliverability • Minor Steps Remaining"
											: "Action Required • High Spam Risk"}
									</h3>
									{deliverabilityScore === 100 && (
										<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
											<ShieldCheck className="h-3 w-3" />
											Google & Yahoo Compliant
										</span>
									)}
								</div>
								<p className="text-xs opacity-80 mt-0.5">
									{deliverabilityScore === 100
										? "All authentication records (MX, SPF, DKIM, DMARC) are verified. Outbound mail will reliably reach recipients' primary inboxes."
										: "Complete the missing DNS records below to ensure outgoing emails do not land in spam folders."}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							{onDnsChanged && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={checking}
									onClick={async () => {
										setChecking(true);
										try {
											const res = await fetch(`/api/domains/${domain.id}/dns/verify`, {
												method: "POST",
												credentials: "same-origin",
											});
											if (res.ok) {
												const data = (await res.json()) as {
													report?: {
														score?: number;
														checks?: { mx?: { valid?: boolean }; spf?: { valid?: boolean }; dkim?: { valid?: boolean } };
													};
												};
												const score = data.report?.score ?? 0;
												const allCoreValid = Boolean(
													data.report?.checks?.mx?.valid &&
													data.report?.checks?.spf?.valid &&
													data.report?.checks?.dkim?.valid,
												);
												if (allCoreValid) {
													notify.success(`DNS verified (${score}% score). Domain is now active for sending and receiving.`);
												} else {
													notify.info(`DNS check complete (${score}% score). Publish the remaining records below and verify again.`);
												}
											} else {
												const body = (await res.json().catch(() => null)) as { error?: string } | null;
												notify.error(body?.error || "Could not complete DNS verification check");
											}
											if (onDnsChanged) {
												await onDnsChanged();
											}
										} catch (err) {
											console.error("DNS verification error:", err);
											notify.error("Could not complete DNS verification check");
										} finally {
											setChecking(false);
										}
									}}
									className="gap-1.5 bg-white shadow-2xs hover:bg-neutral-50 active:scale-95 transition-[background-color,transform]"
								>
									<RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
									{checking ? "Verifying…" : "Verify DNS"}
								</Button>
							)}
							<Button size="sm" asChild className="rounded-full">
								<a href={mailUrl}>Open Inbox</a>
							</Button>
						</div>
					</div>

					<div>
						<h2 className="text-base font-semibold text-neutral-900">DNS connection records</h2>
						<p className="mt-0.5 text-xs text-neutral-500">
							Add these records at your domain registrar (Namecheap, GoDaddy, Cloudflare, Route53) to connect {domain.hostname}.
						</p>
					</div>

					<ul className="mt-3 space-y-2">
						{(["mx", "spf", "dkim", "dmarc"] as DnsAuthRecord[]).map((record) => {
							const item = audit[record];
							if (!item) return null;
							const ok = item.status === "ok";
							const expected = expectedValues[record];

							return (
								<li key={record} className={`${ROW_GRID} ${getDnsAuthItemClass(item.status)}`}>
									<StatusBadge ok={ok} tone={item.status === "missing" ? "red" : "neutral"} />
									<span className="min-w-0">
										<span className="block font-medium text-neutral-900">{`${item.label} record`}</span>
										<span className="block text-xs text-neutral-500">{dnsAuthDescriptions[record]}</span>
									</span>
									{ok ? (
										<span className="min-w-0 break-all font-mono text-xs text-neutral-600">
											{item.found.length > 0 ? item.found.join(", ") : item.name}
										</span>
									) : expected ? (
										<div className="flex min-w-0 flex-wrap items-center justify-start sm:justify-end gap-2">
											<span className="min-w-0 break-all rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-mono text-xs text-neutral-700">
												{expected.type} &middot; {expected.host} &rarr; {expected.value}
											</span>
											<CopyValueButton value={expected.value} />
										</div>
									) : (
										<span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600">
											Managed by Replyot
										</span>
									)}
								</li>
							);
						})}
					</ul>
					{dns.sending.length > 0 && (
						<div className="mt-4 border-t border-neutral-200/80 pt-4">
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
								Sending Verification Records
							</p>
							<ul className="space-y-2">
								{dns.sending.map((rec, i) => {
									const recValue = rec.content || "";
									const verified = domain.sendingEnabled;
									return (
										<li
											key={`${rec.type}-${rec.name}-${i}`}
											className={`${ROW_GRID} ${verified ? "border-neutral-200 bg-neutral-50/70" : "border-amber-200 bg-amber-50/60"}`}
										>
											<StatusBadge ok={verified} tone={verified ? "neutral" : "red"} />
											<span className="min-w-0">
												<span className="block font-medium text-neutral-900">
													{rec.type} &middot; {rec.name || "@"}
													{rec.priority !== undefined ? ` (Priority ${rec.priority})` : ""}
												</span>
												<span className="block text-xs text-neutral-500">
													{verified ? "Verified for outbound sending" : "Add this DNS record to enable outbound sending"}
												</span>
											</span>
											<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
												<span className="min-w-0 break-all rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-mono text-xs text-neutral-700">
													{recValue}
												</span>
												<CopyValueButton value={recValue} />
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</section>
			)}
		</div>
	);
}
