"use client";

import Link from "next/link";
import { mobilePrimaryActionClass } from "@/components/page-header-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { List } from "@/components/ui/list";
import { CheckCircle2, LoaderCircle, Plus } from "@/components/icons";
import { authFetch } from "@/lib/auth/client";
import type { DnsAuthRecord, DnsStatusSummary, Domain, DomainDnsCache, DomainDnsView, DomainPreflight, ReceivingProvider, SendingProvider } from "./types";
import DomainItemCard from "./DomainItemCard";
import { SectionRowSkeleton } from "@/components/page-skeletons";
import { checkDomain } from "./utils";
import { confirmMxReplacement, createDomain, isMxConflictError } from "./api";

export default function DomainsPage() {
  const qc = useQueryClient();
  const [hostname, setHostname] = useState("");
  // Self-hosted installs without Cloudflare credentials manage DNS by hand.
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await (await authFetch("/api/auth/me")).json()) as { managesDns?: boolean },
  });
  const managesDns = me?.managesDns ?? true;
  const [domainCheck, setDomainCheck] = useState<DomainPreflight | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);
  const [skipDns, setSkipDns] = useState(false);
  const [sendingProvider, setSendingProvider] = useState<SendingProvider>("postfix");
  const [receivingProvider, setReceivingProvider] = useState<ReceivingProvider>("postfix");
  const [domainCheckError, setDomainCheckError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [setupRecord, setSetupRecord] = useState<DnsAuthRecord | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const expandedIdRef = useRef<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [dnsViews, setDnsViews] = useState<DomainDnsCache>({});

  const { data, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => {
      const res = await authFetch("/api/domains?includeDns=true");
      return (await res.json()) as {
        domains: Domain[];
        dns: Record<string, DnsStatusSummary>;
      };
    },
  });

  const { data: planData } = useQuery({
    queryKey: ["workspace-plan"],
    queryFn: async () => {
      const res = await authFetch("/api/workspace/plan");
      if (!res.ok) return null;
      return (await res.json()) as { workspace?: { status?: string } };
    },
  });

  const isWorkspaceActive = planData?.workspace?.status === "active";

  const create = useMutation({
    mutationFn: async () => {
      const normalized = hostname.toLowerCase().trim();
      return createDomain({
        hostname: normalized,
        enableRouting: true,
      });
    },
    onSuccess: () => {
      setHostname("");
      setDomainCheck(null);
      setSkipDns(false);
      setSendingProvider("postfix");
      setReceivingProvider("postfix");
      setDomainCheckError(null);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/domains/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  const loadDns = async (id: string) => {
    const res = await authFetch(`/api/domains/${id}/dns`);
    const json = (await res.json()) as {
      domain?: Domain;
      dns?: DomainDnsView;
      error?: string;
    };
    if (!res.ok || !json.domain || !json.dns) {
      throw new Error(json.error ?? "Failed to load DNS");
    }
    const loadedView = { domain: json.domain, dns: json.dns };
    setDnsViews((current) => ({ ...current, [id]: loadedView }));
  };

  const toggleDns = async (id: string) => {
    if (expandedDomainId === id) {
      expandedIdRef.current = null;
      setExpandedDomainId(null);
      setDnsLoading(false);
      setDnsError(null);
      return;
    }
    // Expand immediately and show a skeleton while the audit is fetched, rather
    // than leaving the card unchanged until the request resolves.
    expandedIdRef.current = id;
    setExpandedDomainId(id);
    setDnsError(null);
    if (dnsViews[id]) {
      setDnsLoading(false);
      return;
    }
    setDnsLoading(true);
    try {
      await loadDns(id);
    } catch (error) {
      if (expandedIdRef.current === id) {
        setDnsError(error instanceof Error ? error.message : "Failed to load DNS");
      }
    } finally {
      if (expandedIdRef.current === id) setDnsLoading(false);
    }
  };

  const [sendingBusy, setSendingBusy] = useState(false);

  const changeSendingProvider = async (provider: SendingProvider) => {
    if (!expandedDomainId) return;
    const id = expandedDomainId;
    setSendingBusy(true);
    try {
      const put = async (replaceMx: boolean) => {
        const res = await authFetch(`/api/domains/${id}/sending`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, replaceMx }),
        });
        return { res, json: (await res.json()) as { warning?: string; error?: string; code?: string; records?: { content: string; priority: number }[] } };
      };
      let { res, json } = await put(false);
      // Cloudflare sending refuses while another service's MX records exist.
      if (confirmMxReplacement(res, json)) ({ res, json } = await put(true));
      if (!res.ok) throw new Error(json.error ?? "Failed to change sending provider");
      if (json.warning) notify.warning(json.warning);
      else notify.success("Sending provider updated");
      await loadDns(id);
      qc.invalidateQueries({ queryKey: ["domains"] });
    } catch (error) {
      notify.error(error, "Could not change the sending provider");
    } finally {
      setSendingBusy(false);
    }
  };

  const [receivingBusy, setReceivingBusy] = useState(false);

  const changeReceivingProvider = async (provider: ReceivingProvider) => {
    if (!expandedDomainId) return;
    const id = expandedDomainId;
    setReceivingBusy(true);
    try {
      const res = await authFetch(`/api/domains/${id}/receiving`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to change receiving provider");
      notify.success("Receiving provider updated");
      await loadDns(id);
      qc.invalidateQueries({ queryKey: ["domains"] });
    } catch (error) {
      notify.error(error, "Could not change the receiving provider");
    } finally {
      setReceivingBusy(false);
    }
  };

  const refreshExpandedDns = () => {
    if (!expandedDomainId) return;
    void loadDns(expandedDomainId).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["domains"] });
  };

  const setupDns = async (record: DnsAuthRecord) => {
    if (!expandedDomainId) return;
    const dnsView = dnsViews[expandedDomainId];
    if (!dnsView) return;
    setSetupRecord(record);
    try {
      const post = async (replaceMx: boolean) => {
        const res = await authFetch(`/api/domains/${dnsView.domain.id}/dns/setup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record, replaceMx }),
        });
        return {
          res,
          json: (await res.json()) as {
            domain?: Domain;
            dns?: DomainDnsView;
            error?: string;
            code?: string;
            records?: { content: string; priority: number }[];
          },
        };
      };
      let { res, json } = await post(false);
      if (confirmMxReplacement(res, json)) ({ res, json } = await post(true));
      if (!res.ok) throw new Error(json.error ?? "Failed to set up DNS record");
      if (json.domain && json.dns) {
        const updatedView = { domain: json.domain, dns: json.dns };
        setDnsViews((current) => ({
          ...current,
          [dnsView.domain.id]: updatedView,
        }));
      } else await loadDns(dnsView.domain.id);
      qc.invalidateQueries({ queryKey: ["domains"] });
    } catch (error) {
      notify.error(error, "Could not set up the DNS record");
    } finally {
      setSetupRecord(null);
    }
  };

  const inspectDomain = async () => {
    const normalized = hostname.toLowerCase().trim();
    if (skipDns || normalized.length < 3 || domainCheck?.hostname === normalized) return;

    setDomainChecking(true);
    setDomainCheckError(null);
    const result = await checkDomain(normalized);
    setDomainChecking(false);
    if (!result.ok || !result.domain) {
      setDomainCheck(null);
      setDomainCheckError(result.error ?? "Domain check failed");
      return;
    }

    setDomainCheck(result.domain);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium">Domains</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Connect your custom domain to send and receive business email. Open DNS on any domain to view your copyable MX, SPF, DKIM, and DMARC records.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className={mobilePrimaryActionClass}>
              <Plus className="h-4 w-4" />
              New domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add domain</DialogTitle>
              <DialogDescription>
                Connect a Cloudflare zone, then choose which service receives its mail and whether Replyot should provision Email Sending.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  value={hostname}
                  onChange={(e) => {
                    setHostname(e.target.value);
                    if (domainCheck?.hostname !== e.target.value.toLowerCase().trim()) {
                      setDomainCheck(null);
                    }
                  }}
                  onBlur={() => void inspectDomain()}
                  placeholder="example.com"
                />
              </div>
              {domainCheckError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {domainCheckError}
                </p>
              )}
              {create.isError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p>{(create.error as Error).message}</p>
                </div>
              )}
              <Button
                onClick={() => create.mutate()}
                disabled={!hostname || domainChecking || create.isPending}
              >
                {create.isPending ? "Adding..." : "Add domain"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isWorkspaceActive && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-950">
              Activate Full Workspace Features
            </p>
            <p className="text-xs sm:text-sm text-blue-800/80">
              Choose your plan to activate outbound deliverability, add team mailboxes, and unlock cloud storage.
            </p>
          </div>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <Link href="/admin/plan">View Plans &amp; Activate &rarr;</Link>
          </Button>
        </div>
      )}

      <section className="space-y-3">
        {/* <div className="flex items-center justify-between">
					<span className="text-sm text-neutral-500">{(data?.domains ?? []).length} total</span>
				</div> */}
        {isLoading && (
          <SectionRowSkeleton />
        )}
        {!isLoading && (data?.domains ?? []).length === 0 && (
          <p className="rounded-2xl bg-white px-5 py-4 text-sm text-neutral-500">
            No domains yet
          </p>
        )}
        <List>
          {(data?.domains ?? []).map((d) => {
            const dns = data?.dns?.[d.id];
            return (
              <DomainItemCard
                key={d.id}
                dns={dns}
                dnsDetails={dnsViews[d.id]?.dns}
                onSendingProviderChange={changeSendingProvider}
                sendingProviderBusy={sendingBusy}
                onReceivingProviderChange={changeReceivingProvider}
                receivingProviderBusy={receivingBusy}
                onDnsChanged={refreshExpandedDns}
                dnsLoading={expandedDomainId === d.id && dnsLoading}
                dnsError={expandedDomainId === d.id ? dnsError : null}
                expanded={expandedDomainId === d.id}
                onToggleDns={toggleDns}
                onSetup={setupDns}
                setupRecord={setupRecord}
                item={d}
                remove={remove}
              />
            );
          })}
        </List>
      </section>
    </div>
  );
}
