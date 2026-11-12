"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { dnsAuthDescriptions, getDnsAuthItemClass } from "./utils";
import { ROW_GRID, StatusBadge } from "./status-row";
import type { DnsAuthRecord, DomainDnsDetailsProps } from "./types";

function CopyValueButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="h-7 shrink-0 gap-1.5 bg-white px-2.5 text-xs"
			onClick={() => {
				void navigator.clipboard.writeText(value).then(() => {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1800);
				});
			}}
		>
			{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}

export default function DomainDnsDetails({
	domain,
	dns,
	setupMessage,
	onDnsChanged,
}: DomainDnsDetailsProps) {
	const [checking, setChecking] = useState(false);
	const audit = dns.audit;
	const mailHost = `mail.${domain.hostname}`;

	const expectedValues: Record<DnsAuthRecord, { host: string; type: string; value: string } | null> = {
		mx: { host: "@", type: "MX", value: `10 ${mailHost}.` },
		spf: { host: "@", type: "TXT", value: `v=spf1 a:${mailHost} ~all` },
		dkim: process.env.NEXT_PUBLIC_PLATFORM_DKIM_RECORD
			? {
					host: process.env.NEXT_PUBLIC_PLATFORM_DKIM_HOST || "replyot._domainkey",
					type: "TXT",
					value: process.env.NEXT_PUBLIC_PLATFORM_DKIM_RECORD,
				}
			: null,
		dmarc: { host: "_dmarc", type: "TXT", value: "v=DMARC1; p=none" },
	};

	const mxReady = audit?.mx.status === "ok";
	const mailOrigin =
		process.env.NEXT_PUBLIC_MAIL_APP_URL?.replace(/\/+$/, "") ||
		(typeof window !== "undefined" && window.location.hostname.startsWith("admin.")
			? `${window.location.protocol}//${window.location.host.replace(/^admin\./, "")}`
			: "");
	const mailUrl = `${mailOrigin}/inbox`;

	return (
		<div className="space-y-5 px-4 pb-5 pt-4 sm:px-5">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
					<div>
						<p className="text-sm font-medium text-neutral-900">Inbound email</p>
						<p className="text-xs text-neutral-500">Handled by Replyot Mail Server</p>
					</div>
					<span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${mxReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
						{mxReady ? "Active" : "Waiting for MX"}
					</span>
				</div>
				<div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
					<div>
						<p className="text-sm font-medium text-neutral-900">Outbound email</p>
						<p className="text-xs text-neutral-500">Handled by Replyot Mail Server</p>
					</div>
					<span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
						Active
					</span>
				</div>
			</div>

			{audit && (
				<section>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<h2 className="text-base font-semibold text-neutral-900">DNS connection</h2>
							<p className="mt-0.5 text-sm text-neutral-500">
								Add these records at your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.) to connect {domain.hostname}.
							</p>
						</div>
						<div className="flex items-center gap-2">
							{onDnsChanged && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={checking}
									onClick={() => {
										setChecking(true);
										onDnsChanged();
										window.setTimeout(() => setChecking(false), 1200);
									}}
									className="gap-1.5 bg-white"
								>
									<RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
									Check DNS
								</Button>
							)}
							<Button size="sm" asChild className="rounded-full">
								<a href={mailUrl}>Go to Inbox</a>
							</Button>
						</div>
					</div>

					<ul className="mt-3 space-y-2">
						{(["mx", "spf", "dmarc"] as DnsAuthRecord[]).map((record) => {
							const item = audit[record];
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
										<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
									const verified = rec.status === "ok" || rec.status === "verified";
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
													{rec.value}
												</span>
												<CopyValueButton value={rec.value} />
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}
					{setupMessage && <p role="alert" className="mt-2 text-xs text-red-600">{setupMessage}</p>}
				</section>
			)}
		</div>
	);
}
