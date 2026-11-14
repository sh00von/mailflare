"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/auth/client";
import {
  PLAN_LIST,
  calculatePlanPricing,
  getPlanDefinition,
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

function QuotaCard({
  title,
  used,
  limit,
  unit = "",
  percent = 0,
  loading = false,
}: {
  title: string;
  used: string | number;
  limit: string | number;
  unit?: string;
  percent?: number;
  loading?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const tone = clamped >= 95 ? "bg-red-500" : clamped >= 80 ? "bg-amber-500" : "bg-blue-600";

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
        <span>{title}</span>
        <span className="font-mono">{clamped}%</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <div className="flex items-baseline gap-1 text-xl font-bold text-neutral-900">
          <span>{used}</span>
          <span className="text-xs font-normal text-neutral-400">/ {limit} {unit}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: `${Math.max(3, clamped)}%` }}
        />
      </div>
    </div>
  );
}

export default function PlanAndUsagePage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanId | "portal" | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

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
        if (json.workspace?.billingCycle) {
          setCycle(json.workspace.billingCycle);
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
  const limits = workspace?.planDetails ?? getPlanDefinition(workspace?.plan ?? "pro");
  const plans = data?.plans ?? PLAN_LIST;
  const billing = data?.billing;
  const invoices = data?.invoices ?? [];
  const stripeReady = billing?.stripeConfigured ?? false;
  const loading = !data && !error;
  const isPaidActive = workspace?.status === "active";
  const isTrial = workspace?.status === "trialing" && !workspace.trialExpired;
  const currentPlanId: PlanId = workspace?.plan ?? "free";

  async function startCheckout(planId: PlanId) {
    if (planId === "free") {
      notify.info("You are already on the Free tier.");
      return;
    }
    setBusyPlan(planId);
    try {
      const res = await authFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          cycle,
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
        notify.error(payload, "Could not open billing portal");
        return;
      }
      window.location.assign(payload.url);
    } catch (err) {
      notify.error(err, "Could not open billing portal");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
            Subscription &amp; Plans
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Predictable, cost-effective business email. Upgrade or adjust your plan anytime.
          </p>
        </div>

        {stripeReady && billing?.hasCustomer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-neutral-300 hover:bg-neutral-50 self-start sm:self-auto cursor-pointer"
            disabled={busyPlan !== null}
            onClick={() => void openBillingPortal()}
          >
            {busyPlan === "portal" ? "Opening portal..." : "Manage Billing & Cards"}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
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

      {/* Active Subscription Status Banner */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 md:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Current Plan:
              </span>
              <span className="text-lg font-bold text-neutral-900">
                {limits.name}
              </span>
              {isPaidActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-3 w-3" /> Active Subscription
                </span>
              ) : isTrial ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  <Sparkles className="h-3 w-3" /> 14-Day Free Pro Trial ({workspace?.daysLeftInTrial ?? 14} days left)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                  Free Forever
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-600">
              {isPaidActive
                ? `Billed ${workspace?.billingCycle === "yearly" ? "Yearly" : "Monthly"}${
                    billing?.currentPeriodEnd
                      ? ` · Renews on ${new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                      : ""
                  }`
                : isTrial
                  ? "Explore all 5 mailboxes and 3 domains risk-free. No credit card required."
                  : "Basic single-mailbox capacity. Upgrade to Starter or Pro for extra mailboxes and priority throughput."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 hidden sm:inline">Billing Cycle:</span>
            <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  cycle === "monthly"
                    ? "bg-white text-neutral-900 border border-neutral-200 shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCycle("yearly")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  cycle === "yearly"
                    ? "bg-white text-neutral-900 border border-neutral-200 shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Yearly
                <span className="text-[10px] text-emerald-600 font-bold ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  2 Months Free
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quotas & Capacity Grid */}
      <div>
        <h2 className="text-base font-semibold text-neutral-900 mb-3">Live Resource Usage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuotaCard
            title="Team Mailboxes"
            used={usage ? usage.mailboxesUsed : 0}
            limit={limits.maxMailboxes}
            percent={usage ? (usage.mailboxesUsed / Math.max(1, limits.maxMailboxes)) * 100 : 0}
            loading={loading}
          />
          <QuotaCard
            title="Custom Domains"
            used={usage ? usage.domainsUsed : 0}
            limit={limits.maxDomains}
            percent={usage ? (usage.domainsUsed / Math.max(1, limits.maxDomains)) * 100 : 0}
            loading={loading}
          />
          <QuotaCard
            title="Storage Used"
            used={usage ? formatBytes(usage.storageUsedBytes) : "0 MB"}
            limit={limits.storageLabel}
            percent={usage ? (usage.storageUsedBytes / Math.max(1, limits.storageLimitBytes)) * 100 : 0}
            loading={loading}
          />
          <QuotaCard
            title="Outbound Today"
            used={usage ? usage.dailySentCount : 0}
            limit={limits.dailySendLimit}
            percent={usage ? (usage.dailySentCount / Math.max(1, limits.dailySendLimit)) * 100 : 0}
            loading={loading}
          />
        </div>
      </div>

      {/* 4-Tier Plan Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Available Plans</h2>
            <p className="text-xs text-neutral-500">Pick the plan that fits your current volume. Change anytime.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const pricing = calculatePlanPricing(p.id, cycle);
            const isCurrent = currentPlanId === p.id && (isPaidActive || p.id === "free");
            const isHighlighted = p.highlighted;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all duration-200 ${
                  isHighlighted
                    ? "border-blue-600 shadow-md ring-1 ring-blue-600/20"
                    : "border-neutral-200/90 shadow-2xs hover:border-neutral-300"
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{p.name}</h3>
                    <p className="mt-1 text-xs text-neutral-500 min-h-[32px]">{p.tagline}</p>
                  </div>

                  <div className="border-y border-neutral-100 py-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-neutral-900">
                        {p.id === "free" ? "$0" : `$${pricing.monthlyEquivalent.toFixed(2)}`}
                      </span>
                      <span className="text-xs font-medium text-neutral-500">/ month</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                      {pricing.billingText}
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-600">
                    {p.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  {p.id === "free" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCurrent}
                      className="w-full rounded-xl border-neutral-200 text-xs font-semibold"
                    >
                      {isCurrent ? "Current Plan" : "Free Forever"}
                    </Button>
                  ) : stripeReady ? (
                    <Button
                      type="button"
                      disabled={busyPlan !== null || isCurrent}
                      onClick={() => void startCheckout(p.id)}
                      className={`w-full rounded-xl text-xs font-semibold cursor-pointer ${
                        isHighlighted
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                          : "bg-neutral-900 hover:bg-neutral-800 text-white"
                      }`}
                    >
                      {busyPlan === p.id
                        ? "Redirecting..."
                        : isCurrent
                          ? "Current Plan"
                          : `Choose ${p.name}`}
                      {!isCurrent && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                    </Button>
                  ) : (
                    <p className="text-[11px] text-center text-neutral-400">
                      Stripe setup required
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices History Table */}
      {invoices.length > 0 && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Payment &amp; Invoice History</h2>
              <p className="text-xs text-neutral-500">Download PDF receipts for your accounting records.</p>
            </div>
            <FileText className="h-5 w-5 text-neutral-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-3 font-medium text-neutral-900">
                      {new Date(inv.created * 1000).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono">{inv.number ?? inv.id.slice(-8)}</td>
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      ${(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {inv.invoice_pdf ? (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
