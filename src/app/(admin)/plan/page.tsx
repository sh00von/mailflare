"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  MailPlus,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/auth/client";
import {
  ADDONS_CATALOG,
  MIN_MAILBOXES,
  PLAN_LIST,
  calculateWorkspacePricing,
  type BillingCycle,
  type PlanDefinition,
  type PlanId,
} from "@/lib/plans/catalog";
import type { WorkspaceSummary, WorkspaceUsage } from "@/lib/plans/usage";

type StripeInvoice = {
  id: string;
  number: string | null;
  created: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: number;
  period_end: number;
};

type PlanResponse = {
  workspace: WorkspaceSummary;
  usage: WorkspaceUsage;
  plans: PlanDefinition[];
  billing?: {
    stripeConfigured: boolean;
    hasCustomer: boolean;
    currentPeriodEnd: string | null;
  };
  invoices?: StripeInvoice[];
  error?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function UsageRow({
  label,
  usedLabel,
  maxLabel,
  availableLabel,
  pct = 0,
  loading = false,
}: {
  label: string;
  usedLabel?: string;
  maxLabel?: string;
  availableLabel?: string;
  pct?: number;
  loading?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const tone =
    clamped >= 95
      ? "bg-red-500"
      : clamped >= 80
        ? "bg-amber-500"
        : "bg-blue-600";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-0.5 sm:gap-0">
        <span className="font-medium text-neutral-800">{label}</span>
        {loading ? (
          <Skeleton className="h-3 w-16" />
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-neutral-900">{usedLabel} of {maxLabel} used</span>
            {availableLabel && (
              <span className="text-emerald-700 font-medium">({availableLabel} available)</span>
            )}
            <span className="text-neutral-400 font-mono">· {clamped}% capacity</span>
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-2 w-full rounded-full" />
      ) : (
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${tone}`}
            style={{ width: `${Math.max(2, clamped)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function PlanAndUsagePage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanId | "portal" | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("12m");
  const [mailboxesCount, setMailboxesCount] = useState<number>(MIN_MAILBOXES);

  useEffect(() => {
    let sessionId: string | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("billing");
      sessionId = params.get("session_id");
      if (status === "success")
        setBillingNotice("Payment confirmed! Your subscription is now active.");
      else if (status === "canceled")
        setBillingNotice("Checkout was canceled. No changes were made.");
    }

    let cancelled = false;
    const fetchUrl = sessionId
      ? `/api/workspace/plan?session_id=${encodeURIComponent(sessionId)}`
      : "/api/workspace/plan";

    authFetch(fetchUrl, { cache: "no-store" })
      .then(async (res) => ({ res, json: (await res.json()) as PlanResponse }))
      .then(({ res, json }) => {
        if (cancelled) return;
        if (!res.ok)
          throw new Error(json.error ?? "Failed to load plan details");
        setData(json);
        if (json.workspace) {
          if (typeof json.workspace.maxMailboxes === "number" && json.workspace.maxMailboxes >= MIN_MAILBOXES) {
            setMailboxesCount(json.workspace.maxMailboxes);
          }
          if (json.workspace.billingCycle) {
            setCycle(json.workspace.billingCycle);
          }
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load plan details",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const workspace = data?.workspace;
  const usage = data?.usage;
  const limits = workspace?.planDetails;
  const plans = data?.plans ?? PLAN_LIST;
  const billing = data?.billing;
  const invoices = data?.invoices ?? [];
  const stripeReady = billing?.stripeConfigured ?? false;
  const loading = !data && !error;
  const isActive = workspace?.status === "active";

  async function startCheckout(planId: PlanId) {
    setBusyPlan(planId);
    try {
      const res = await authFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          cycle,
          mailboxes: mailboxesCount,
        }),
      });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        notify.error(payload, "Could not start checkout");
        return;
      }
      window.location.assign(payload.url);
    } catch (err) {
      notify.error(err, "Could not start checkout");
    } finally {
      setBusyPlan(null);
    }
  }

  async function openBillingPortal() {
    setBusyPlan("portal");
    try {
      const res = await authFetch("/api/billing/portal", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        notify.error(payload, "Could not open the billing portal");
        return;
      }
      window.location.assign(payload.url);
    } catch (err) {
      notify.error(err, "Could not open the billing portal");
    } finally {
      setBusyPlan(null);
    }
  }

  const primaryPlan = plans[0] ?? PLAN_LIST[0];
  const pricing = calculateWorkspacePricing(mailboxesCount, cycle);
  const isCurrentSubscription =
    isActive &&
    mailboxesCount === (workspace?.maxMailboxes ?? MIN_MAILBOXES) &&
    cycle === (workspace?.billingCycle ?? "12m");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-medium text-neutral-900">
          Plan &amp; Usage
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Choose your team mailbox capacity, track limits, and manage your workspace subscription.
        </p>
      </div>

      {billingNotice && (
        <div
          role="status"
          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900"
        >
          {billingNotice}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 1. Subscription & Custom Mailbox Plan Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
        {/* Active Subscription Banner - Flat & Clean */}
        {isActive && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <Check className="h-3 w-3" /> Active Subscription
                </span>
                <span className="text-xs text-neutral-500">
                  Billed {workspace?.billingCycle === "3m" ? "Quarterly" : workspace?.billingCycle === "6m" ? "Semi-Annually" : "Yearly"}
                </span>
              </div>
              <p className="text-lg font-bold text-neutral-900">
                {workspace?.maxMailboxes ?? 5} Team Mailboxes · {workspace?.maxMailboxes ?? 5} GB NVMe Storage
              </p>
              {billing?.currentPeriodEnd && (
                <p className="text-xs text-neutral-500">
                  Renews on {new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            {stripeReady && billing?.hasCustomer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start sm:self-auto rounded-lg text-xs font-medium border-neutral-300 hover:bg-neutral-50"
                disabled={busyPlan !== null}
                onClick={() => void openBillingPortal()}
              >
                {busyPlan === "portal" ? "Opening portal..." : "Manage Billing & Invoices"}
              </Button>
            )}
          </div>
        )}

        {/* Plan Header + Billing Cycle Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                {isActive ? "Adjust Workspace Capacity" : primaryPlan.name}
              </h2>
              <Badge
                variant={isActive ? "success" : "secondary"}
                className="capitalize"
              >
                {isActive ? "Active Plan" : "Setup Mode"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {isActive
                ? "Scale your team inboxes up or down anytime. Volume pricing adjusts automatically."
                : "Custom team mailbox capacity with transparent volume pricing. Minimum 5 inboxes."}
            </p>
          </div>

          {/* Billing Cycle Switcher - Flat Segmented Control */}
          <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCycle("12m")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                cycle === "12m"
                  ? "bg-white text-neutral-900 border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              12 Months <span className="text-[10px] text-emerald-600 font-bold ml-1">Save 40%</span>
            </button>
            <button
              type="button"
              onClick={() => setCycle("6m")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                cycle === "6m"
                  ? "bg-white text-neutral-900 border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setCycle("3m")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                cycle === "3m"
                  ? "bg-white text-neutral-900 border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              3 Months
            </button>
          </div>
        </div>

        {/* Mailbox Capacity Stepper - Clean Inline Layout, No Nested Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">
                Team Mailbox Quantity
              </span>
              {isActive && !isCurrentSubscription && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                  Adjusting
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Minimum 5 mailboxes · 1 GB dedicated NVMe storage included per mailbox
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={mailboxesCount <= MIN_MAILBOXES}
              onClick={() => setMailboxesCount((c) => Math.max(MIN_MAILBOXES, c - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Decrease mailboxes"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex h-9 min-w-16 items-center justify-center rounded-lg bg-neutral-50 px-3 font-mono font-bold text-base text-neutral-900 border border-neutral-200">
              {mailboxesCount}
            </div>
            <button
              type="button"
              onClick={() => setMailboxesCount((c) => c + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
              aria-label="Increase mailboxes"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Price Hero - Flat, Open, No Nested Card Box */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-y border-neutral-100 py-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-neutral-900">
                ${pricing.totalMonthlyEquivalent.toFixed(2)}
              </span>
              <span className="text-sm font-medium text-neutral-500">/ month</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-blue-600">
              {pricing.billingText}
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-sm font-semibold text-neutral-900">
              ${pricing.pricePerMailboxMonthly.toFixed(2)} / mailbox / mo
            </span>
            <p className="text-xs text-neutral-500 mt-0.5">
              {pricing.mailboxes} mailboxes &amp; {pricing.storageGb} GB dedicated NVMe storage
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-neutral-700 pt-1">
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span><strong className="font-semibold text-neutral-900">{pricing.mailboxes}</strong> active team mailboxes included</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span><strong className="font-semibold text-neutral-900">{pricing.storageGb} GB</strong> workspace storage (1 GB / inbox)</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Up to <strong className="font-semibold text-neutral-900">5 custom domains</strong> with 1-click DNS</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span><strong className="font-semibold text-neutral-900">500 emails/day</strong> outbound relay (Gmail matched)</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span><strong className="font-semibold text-neutral-900">100 emails/hour</strong> burst deliverability protection</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-blue-600" />
            <span><strong className="font-semibold text-neutral-900">25 MB</strong> attachments &amp; SPF/DKIM verification</span>
          </p>
        </div>

        {/* Plan Action CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
          {stripeReady ? (
            <Button
              type="button"
              variant={isCurrentSubscription ? "outline" : "default"}
              className={isCurrentSubscription ? "w-full sm:w-auto rounded-xl" : "w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"}
              disabled={busyPlan !== null || isCurrentSubscription}
              onClick={() => void startCheckout(primaryPlan.id)}
            >
              {busyPlan === primaryPlan.id ? (
                "Redirecting to Stripe..."
              ) : isCurrentSubscription ? (
                "Current Active Subscription"
              ) : isActive ? (
                `Update to ${pricing.mailboxes} Mailboxes ($${pricing.totalCharged.toFixed(2)})`
              ) : (
                `Activate Workspace (${pricing.mailboxes} Mailboxes · $${pricing.totalCharged.toFixed(2)})`
              )}
              {!isCurrentSubscription && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          ) : (
            <p className="text-xs text-neutral-500">
              Stripe billing keys are not set. Workspace is operational in free setup mode.
            </p>
          )}

          {stripeReady && billing?.hasCustomer ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-neutral-300 hover:bg-neutral-50"
              disabled={busyPlan !== null}
              onClick={() => void openBillingPortal()}
            >
              {busyPlan === "portal" ? "Opening portal..." : "Manage Billing & Invoices"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2. Workspace Quotas & Usage Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Workspace Limits &amp; Usage
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Live resource consumption across your domains, mailboxes, and storage.
          </p>
        </div>

        <div className="space-y-4">
          <UsageRow
            label="Custom domains"
            loading={loading}
            usedLabel={usage ? String(usage.domainsUsed) : "0"}
            maxLabel={isActive && limits ? String(limits.maxDomains) : "1"}
            availableLabel={
              usage && limits
                ? String(Math.max(0, limits.maxDomains - usage.domainsUsed))
                : undefined
            }
            pct={
              usage
                ? (usage.domainsUsed /
                    (isActive && limits ? limits.maxDomains : 1)) *
                  100
                : 0
            }
          />

          <UsageRow
            label="Team mailboxes & users"
            loading={loading}
            usedLabel={usage ? String(usage.mailboxesUsed) : "0"}
            maxLabel={String(workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount)}
            availableLabel={
              usage
                ? String(Math.max(0, (workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount) - usage.mailboxesUsed))
                : undefined
            }
            pct={
              usage
                ? (usage.mailboxesUsed /
                    (workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount)) *
                  100
                : 0
            }
          />

          <UsageRow
            label="Workspace storage"
            loading={loading}
            usedLabel={usage ? formatBytes(usage.storageUsedBytes) : "0 B"}
            maxLabel={`${workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount} GB`}
            availableLabel={
              usage
                ? `${Math.max(0, (workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount) - Math.ceil(usage.storageUsedBytes / (1024 ** 3)))} GB`
                : undefined
            }
            pct={
              usage
                ? (usage.storageUsedBytes /
                    ((workspace?.maxMailboxes ?? limits?.maxMailboxes ?? mailboxesCount) * 1024 ** 3)) *
                  100
                : 0
            }
          />

          <UsageRow
            label="Emails sent today (UTC)"
            loading={loading}
            usedLabel={usage ? String(usage.dailySentCount) : "0"}
            maxLabel={isActive && limits ? String(limits.dailySendLimit) : "500"}
            availableLabel={
              usage && limits
                ? String(Math.max(0, limits.dailySendLimit - usage.dailySentCount))
                : undefined
            }
            pct={
              isActive && usage && limits
                ? (usage.dailySentCount / limits.dailySendLimit) * 100
                : 0
            }
          />
        </div>

        <p className="pt-4 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">
          <strong className="font-semibold text-neutral-800">Deliverability guarantee:</strong> All outbound emails are routed through high-reputation Amazon SES relays with automatic 100 emails/hour burst throttling to protect your domain reputation.
        </p>
      </div>

      {/* 3. Mailbox Storage Boosters Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Mailbox Storage Boosters
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Need more storage for specific high-volume inboxes? Assign dedicated +1 GB boosters directly to individual addresses like <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-800">support@</code>.
          </p>
        </div>

        <div className="divide-y divide-neutral-100">
          {ADDONS_CATALOG.map((addon) => {
            const isStorage = addon.id.includes("storage");
            const IconComponent = isStorage ? HardDrive : MailPlus;
            return (
              <div
                key={addon.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 first:pt-2 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <IconComponent className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-neutral-900">
                      {addon.name}
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {addon.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="font-semibold text-xs text-neutral-900">
                      ${addon.priceMonthlyEquivalent.toFixed(2)}/mo
                    </span>
                    <span className="block text-[11px] text-neutral-400">
                      Billed ${addon.priceQuarterlyUsd} / 3mo
                    </span>
                  </div>

                  <Button asChild size="sm" variant="outline" className="rounded-lg border-neutral-300 hover:bg-neutral-50">
                    <Link href="/admin/mailboxes">
                      {isStorage ? "Assign to Inbox" : "Add Mailbox"}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Payment History & Invoices Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Payment History &amp; Invoices
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            View past subscription charges and download official PDF receipts.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 pl-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 pr-4 font-medium text-neutral-800">
                      {new Date(inv.created * 1000).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-500">
                      {inv.number || inv.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900">
                      ${(inv.amount_paid / 100).toFixed(2)}{" "}
                      <span className="text-xs text-neutral-400 uppercase">
                        {inv.currency}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {inv.status === "paid" ? "Paid" : inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </a>
                        )}
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-neutral-500">
            No payment invoices yet. Downloadable PDF receipts and past charges will appear here automatically.
          </div>
        )}
      </div>
    </div>
  );
}
