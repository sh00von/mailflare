"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-state";
import { useShortcuts } from "./shortcuts";
import { Keyboard, Settings } from "@/components/icons";
import { Tooltip } from "./ui/tooltip";
import { isAdminPath } from "@/components/mailbox-selector-utils";

export function SidebarFooter() {
	const pathname = usePathname();
	const { minimal } = useSidebar();
	const { openHelpModal, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	const isAdmin = isAdminPath(pathname);

	if (minimal) {
		if (isAdmin) return null;
		return (
			<div className="flex flex-col items-center py-2">
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
