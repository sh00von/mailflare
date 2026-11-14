"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, HardDrive, Mail, MailPlus, Plus, Sparkles, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ManagedAccount, ManagedDomain, ManagedMailbox } from "../types";
import {
  addManagedMailbox,
  fetchManagedAccount,
  fetchManagedDomains,
  fetchManagedMailboxes,
  removeManagedMailbox,
} from "../utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function AccountMailboxesPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<ManagedAccount | null>(null);
  const [mailboxes, setMailboxes] = useState<ManagedMailbox[]>([]);
  const [domains, setDomains] = useState<ManagedDomain[]>([]);
  const [localPart, setLocalPart] = useState("");
  const [domainId, setDomainId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const [nextAccount, nextMailboxes, nextDomains] = await Promise.all([
      fetchManagedAccount(id),
      fetchManagedMailboxes(id),
      fetchManagedDomains(),
    ]);
    setAccount(nextAccount);
    setMailboxes(nextMailboxes);
    setDomains(nextDomains);
    setDomainId((current) => current || nextDomains[0]?.id || "");
  }

  useEffect(() => {
    void load().catch((error) =>
      setMessage(
        error instanceof Error ? error.message : "Unable to load mailboxes",
      ),
    );
  }, [id]);

  async function addMailbox(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setSaving(true);
    setMessage(null);
    try {
      await addManagedMailbox(account, { domainId, localPart });
      setLocalPart("");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to add mailbox",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMailbox(mailboxId: string) {
    try {
      await removeManagedMailbox(mailboxId);
      notify.success("Mailbox removed");
      await load();
    } catch (error) {
      notify.error(error, "Could not remove the mailbox");
    }
  }

  function copyAddress(address: string, mailboxId: string) {
    void navigator.clipboard.writeText(address);
    setCopiedId(mailboxId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const selectedDomain = domains.find((d) => d.id === domainId)?.hostname;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">Team Mailboxes</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {`Manage dedicated email inboxes for ${account?.name ?? "this account"}. Every mailbox includes 1 GB storage & standard deliverability.`}
        </p>
      </div>

      {/* Mailbox List Card */}
      <section className="space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Current Inboxes</h2>
              <p className="text-xs text-neutral-500">{mailboxes.length} active mailbox{mailboxes.length === 1 ? "" : "es"}</p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full bg-neutral-50 text-neutral-600 border-neutral-200">
            1 GB Quota / Mailbox
          </Badge>
        </div>

        <div className="space-y-3">
          {mailboxes.map((mailbox) => {
            const fullAddress = `${mailbox.localPart}@${mailbox.hostname}`;
            const usedBytes = mailbox.storageUsedBytes ?? 0;
            const quotaBytes = mailbox.storageQuotaBytes ?? 1024 ** 3;
            const pct = Math.min(100, Math.max(0, Math.round((usedBytes / quotaBytes) * 100)));

            return (
              <div
                key={mailbox.id}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 transition-all hover:border-neutral-200 hover:bg-neutral-50 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 font-semibold text-blue-700 text-sm shadow-xs">
                    {(mailbox.displayName || mailbox.localPart).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-neutral-900 text-sm">
                        {mailbox.displayName || mailbox.localPart}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyAddress(fullAddress, mailbox.id)}
                        className="inline-flex items-center text-neutral-400 hover:text-neutral-700 transition"
                        title="Copy email address"
                      >
                        {copiedId === mailbox.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="block truncate text-xs font-mono text-neutral-500">
                      {fullAddress}
                    </span>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="w-28 sm:w-36">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500">
                        {formatBytes(usedBytes)} / {formatBytes(quotaBytes)} ({pct}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t border-neutral-200/50 sm:border-0">
                  <Link
                    href="/plan"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100/70 transition"
                  >
                    <HardDrive className="h-3 w-3" />
                    +1 GB Booster
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    onClick={() => void removeMailbox(mailbox.id)}
                    aria-label={"Remove inbox"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {account && mailboxes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
              <MailPlus className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-700">No mailboxes assigned yet</p>
              <p className="text-xs text-neutral-400">Add an inbox below to start sending and receiving emails.</p>
            </div>
          )}
        </div>

        {/* Booster Upsell Banner */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4.5 text-xs text-neutral-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <span className="font-bold text-neutral-900 text-sm">Need more storage for a specific inbox?</span>
              <p className="text-neutral-600 text-xs mt-0.5 leading-relaxed">
                Add a <strong>1 GB Mailbox Storage Booster</strong> ($0.25/mo billed $1/quarter) directly to high-volume addresses like <code className="rounded bg-blue-100/60 px-1 py-0.5 text-blue-800">support@</code> without paying expensive per-seat tier penalties.
              </p>
            </div>
          </div>
          <Link
            href="/plan"
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs shrink-0 self-start sm:self-auto transition text-center"
          >
            Get +1 GB Booster
          </Link>
        </div>

        {/* Add Inbox Form */}
        <div className="border-t border-neutral-100 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <MailPlus className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-neutral-900">Add an Inbox</h2>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Create a new mailbox for this account. Mailboxes can also be shared with team members.
          </p>

          <form onSubmit={addMailbox} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inbox-name" className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Inbox prefix
                </Label>
                <div className="relative">
                  <Input
                    id="inbox-name"
                    value={localPart}
                    onChange={(event) => setLocalPart(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    placeholder="support, sales, hello"
                    disabled={!account || saving}
                    maxLength={64}
                    className="h-10 rounded-xl font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inbox-domain" className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Domain
                </Label>
                <Select
                  id="inbox-domain"
                  value={domainId}
                  onChange={(event) => setDomainId(event.target.value)}
                  containerClassName="h-10 w-full rounded-xl bg-white"
                  className="text-sm font-medium"
                  disabled={!account || domains.length === 0 || saving}
                  required
                >
                  {domains.length === 0 && <option value="">No domains available</option>}
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      @{domain.hostname}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedDomain && (
              <div className="flex items-center gap-2 rounded-xl bg-neutral-100/80 px-3.5 py-2 text-xs text-neutral-600">
                <span className="font-medium text-neutral-500">Live preview:</span>
                <span className="font-mono font-bold text-blue-700">
                  {localPart || "username"}@{selectedDomain}
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!account || !domainId || !localPart.trim() || saving}
              className="h-10 rounded-full bg-blue-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Creating inbox..." : "Create inbox (1 GB Included)"}
            </Button>
          </form>
        </div>
      </section>

      {message && (
        <p role="status" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
