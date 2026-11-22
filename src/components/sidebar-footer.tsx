"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-state";
import { useShortcuts } from "./shortcuts";
import { useSessionInfo } from "@/hooks/use-current-user";
import { Keyboard, Settings, Sparkles } from "@/components/icons";
import { Tooltip } from "./ui/tooltip";
import { isAdminPath } from "@/components/mailbox-selector-utils";

export function SidebarFooter() {
	const pathname = usePathname();
	const { minimal } = useSidebar();
	const { openHelpModal, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	const session = useSessionInfo();
	const isAdmin = isAdminPath(pathname);

	if (minimal) {
		if (isAdmin) return null;
		return (
			<div className="flex flex-col items-center py-2 gap-1">
				<Tooltip label="Settings" placement="right">
					<Link
						href="/settings/security"
						className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200"
						aria-label="Settings"
					>
						<Settings className="h-5 w-5" />
					</Link>
				</Tooltip>
			</div>
		);
	}

	return (
		<div className="px-3 pt-3 flex flex-col gap-1.5 border-t border-neutral-200/60 mt-2">
			{session?.workspace?.plan && (
				<Link
					href="/admin/plan"
					className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-100/70 hover:bg-neutral-200/70 text-[11px] text-neutral-600 transition-colors group"
				>
					<span className="flex items-center gap-1.5 font-medium text-neutral-800 capitalize">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
						{session.workspace.plan} Plan
					</span>
					<span className="text-[10px] text-neutral-500 group-hover:text-neutral-900 font-medium">Manage &rarr;</span>
				</Link>
			)}
			{!isAdmin && (
				<Link
					href="/settings/security"
					className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
				>
					<Settings className="w-3.5 h-3.5 text-neutral-400" />
					<span>Settings</span>
				</Link>
			)}
			{shortcutsEnabled && !shortcutsPreferenceLoading && (
				<button
					type="button"
					onClick={openHelpModal}
					className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-lg transition-colors"
				>
					<span className="flex items-center gap-1.5">
						<Keyboard className="w-3.5 h-3.5 text-neutral-400" />
						Shortcuts
					</span>
					<kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-neutral-200 rounded text-neutral-500 shadow-2xs">
						?
					</kbd>
				</button>
			)}
		</div>
	);
}
