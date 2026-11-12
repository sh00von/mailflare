"use client";

import { SkipToContent } from "@/components/skip-to-content";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ComposeProvider } from "@/components/compose/compose-context";
import { FloatingComposer } from "@/components/compose/floating-composer";
import { MailSearchInput } from "@/components/mail-search/mail-search-input";
import { MailSearchProvider } from "@/components/mail-search/mail-search-context";
import { MailboxProvider } from "@/components/mailbox-provider";
import { MailboxSelector } from "@/components/mailbox-selector";
import { DnsSkippedBanner } from "@/components/dns-skipped-banner";
import { LicenseIndicator } from "@/components/license-indicator";
import { DashboardNav } from "@/components/dashboard-nav";
import { SidebarProvider } from "@/components/sidebar-state";
import { SidebarAside, MobileMenuButton } from "@/components/sidebar-aside";
import { SidebarResizeBoundary } from "@/components/sidebar-resize-boundary";
import { ShortcutsProvider } from "@/components/shortcuts";
import { RouteTitle } from "@/components/route-title";
import { useAppBadge } from "@/hooks/use-app-badge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAppBadge();

  return (
    <AuthGuard>
      <SidebarProvider mobileOverlay>
        <MailboxProvider>
          <ComposeProvider>
            <MailSearchProvider>
              <ShortcutsProvider>
                <RouteTitle />
                <div className="grid h-dvh grid-cols-[minmax(0,1fr)] overflow-hidden bg-[#f6f8fc] transition-[grid-template-columns] md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]" style={{ transitionDuration: "var(--sidebar-transition-duration)" }}>
                  <SkipToContent />
                  <SidebarAside>
                    <div className="h-full">
                      <DashboardNav />
                    </div>
                    <SidebarResizeBoundary />
                  </SidebarAside>
                  <div className="flex min-h-0 min-w-0 flex-col">
                    <header className="flex h-16 w-full shrink-0 items-center gap-3 pr-4 text-sm">
                      <MobileMenuButton className="ml-2" />
                      <MailSearchInput mobileEnd />
                      <LicenseIndicator />
                      <MailboxSelector />
                    </header>
                    <DnsSkippedBanner />
                    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                      <main id="main-content" tabIndex={-1} className="focus:outline-none min-h-0 min-w-0 flex-1 overflow-y-auto rounded-t-3xl bg-white overscroll-contain scrollbar-gutter-stable">
                        {children}
                      </main>
                    </div>
                  </div>
                  <FloatingComposer showButton />
                </div>
              </ShortcutsProvider>
            </MailSearchProvider>
          </ComposeProvider>
        </MailboxProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}
