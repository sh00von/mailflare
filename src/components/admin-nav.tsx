"use client";

import {
  DatabaseBackup,
  Globe2,
  Activity,
  Mail,
  ExternalLink,
  Settings,
  Palette,
  BadgeDollarSign,
  Users,
  Route,
  KeyRound,
  Bot,
  ShieldCheck,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { NavLink } from "./components-nav-types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NavItem } from "./components-nav";
import { NavSectionHeader, useSectionOpen } from "./nav-section-header";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";
import { SidebarScaffold } from "./sidebar-scaffold";
import { useSidebar } from "./sidebar-state";

type AdminLinkPermission = "primary" | "domains" | "users";

type AdminNavLink = {
  href: string;
  labelKey?: string;
  label?: string;
  icon: typeof Settings;
  permission?: AdminLinkPermission;
};

// `id` names a section for its remembered open/closed state; it is not shown.
const sections: { id?: string; labelKey?: string; links: AdminNavLink[] }[] = [
  {
    // label: "Overview",
    links: [{ href: "/admin/domains", labelKey: "Overview", icon: Settings }],
  },
  {
    id: "Email",
    labelKey: "Email",
    links: [
      { href: "/admin/domains", labelKey: "Domains", icon: Globe2, permission: "domains" },
      { href: "/admin/spam-filter", labelKey: "Spam filter", icon: ShieldCheck, permission: "primary" },
    ],
  },
  {
    id: "Administration",
    labelKey: "Administration",
    links: [
      { href: "/admin/general", labelKey: "General", icon: Settings, permission: "primary" },
      { href: "/admin/mailboxes", label: "Mailboxes", icon: Users },
      { href: "/admin/plan", label: "Plan & Usage", icon: BadgeDollarSign },
      { href: "/admin/workspaces", label: "Workspaces", icon: Globe2, permission: "primary" },
      { href: "/admin/activity", labelKey: "Activity", icon: Activity, permission: "primary" },
      { href: "/admin/backups", labelKey: "Backups", icon: DatabaseBackup, permission: "primary" },
    ],
  },
];

function AdminSection({ id, label, links, showDivider, minimal }: { id?: string; label?: string; links: NavLink[]; showDivider: boolean; minimal: boolean }) {
  const [open, toggle] = useSectionOpen(`replyot:nav:admin-section-open:${id ?? ""}`);
  // Unlabelled sections have nothing to toggle; the icon rail always shows everything.
  const expanded = minimal || !label || open;
  return (
    <section>
      {showDivider && <hr className="mx-6 mb-3 border-neutral-200/70" />}
      {!minimal && label && <NavSectionHeader label={label} open={open} onToggle={toggle} />}
      {expanded && (
        <div className="space-y-px">
          {links.map((link) => (
            <NavItem link={link} key={link.href} />
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminNav({ className }: { className?: string }) {
  const { minimal } = useSidebar();
  const user = useCurrentUser();

  function canSee(link: AdminNavLink): boolean {
    if (!link.permission) return true;
    if (!user) return false;
    if (link.permission === "primary") return user.isPrimaryAdmin;
    if (link.permission === "domains") return user.isPrimaryAdmin || user.canManageDomains;
    return user.isPrimaryAdmin || user.canManageUsers;
  }

  const mailAppUrl = process.env.NEXT_PUBLIC_MAIL_APP_URL || "/mail/inbox";

  return (
    <SidebarScaffold className={className} header={<SidebarHeader href={mailAppUrl} label={"Admin"} />} footer={<SidebarFooter />}>
      <div className={cn("space-y-4", minimal && "space-y-2 pl-1")}>
        <div className={cn("px-3 pb-1", minimal && "px-1")}>
          <a
            href={mailAppUrl}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition-all hover:border-neutral-300 hover:bg-white hover:text-neutral-900",
              minimal && "justify-center px-0 py-2.5 border-0 bg-transparent hover:bg-neutral-100"
            )}
            title="Open Webmail"
          >
            <Mail className="h-4 w-4 text-blue-600 shrink-0" />
            {!minimal && (
              <>
                <span className="flex-1 truncate">Open Webmail</span>
                <ExternalLink className="h-3 w-3 text-neutral-400 shrink-0" />
              </>
            )}
          </a>
        </div>
        {sections.map((section, sectionIndex) => {
          const links = section.links.filter(canSee).map(({ labelKey, label, ...link }): NavLink => ({ ...link, label: label ?? (labelKey ? labelKey : "") }));
          if (links.length === 0) return null;

          return (
            // The first section has no label, so fall back to its first href for a stable key.
            <AdminSection key={section.id ?? links[0].href} id={section.id} label={section.labelKey ? section.labelKey : undefined} links={links} showDivider={minimal && sectionIndex > 0} minimal={minimal} />
          );
        })}
      </div>
    </SidebarScaffold>
  );
}
