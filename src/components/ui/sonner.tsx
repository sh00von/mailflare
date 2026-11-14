"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from "@/components/icons";
import { useIsMobile } from "@/components/sidebar-mobile-utils";

function subscribeToThemeClass(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => observer.disconnect();
}

/** Follows the `dark` class ThemeSync puts on <html>, so toasts match the user's chosen theme, not just the OS. */
function useDocumentTheme(): "light" | "dark" {
	return useSyncExternalStore(
		subscribeToThemeClass,
		() => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
		() => "light",
	);
}

const ICON = "h-[18px] w-[18px]";

/**
 * The app's single toast surface. Mounted once in Providers; everything else calls `notify` from `@/lib/notify`.
 * Colours come from the app tokens (which the dark theme remaps), and the type shows only as the icon colour.
 */
export function Toaster() {
	const isMobile = useIsMobile();
	const theme = useDocumentTheme();
	return (
		<Sonner
			theme={theme}
			// Desktop: bottom-left stays clear of the bottom-right composer. Phone: top stays clear of the Compose button and sheets.
			position={isMobile ? "top-center" : "bottom-left"}
			visibleToasts={3}
			gap={10}
			offset={{ bottom: "max(24px, env(safe-area-inset-bottom))", left: "max(24px, env(safe-area-inset-left))" }}
			mobileOffset={{ top: "max(12px, env(safe-area-inset-top))", left: "12px", right: "12px" }}
			className="toaster group"
			icons={{
				success: <CheckCircle2 className={`${ICON} text-green-600`} />,
				error: <AlertCircle className={`${ICON} text-red-600`} />,
				info: <Info className={`${ICON} text-blue-600`} />,
				warning: <AlertTriangle className={`${ICON} text-amber-500`} />,
				loading: <Loader2 className={`${ICON} animate-spin text-neutral-500`} />,
			}}
			style={{
				"--normal-bg": "var(--color-white)",
				"--normal-text": "var(--color-neutral-900)",
				"--normal-border": "var(--color-neutral-200)",
				"--border-radius": "12px",
			} as CSSProperties}
			toastOptions={{
				classNames: {
					toast: "!gap-3 !px-4 !py-3 !shadow-lg font-sans",
					title: "!text-sm !font-medium !leading-5",
					description: "!text-[13px] !leading-5 !text-neutral-600",
					actionButton: "!h-8 !rounded-md !bg-transparent !px-2.5 !text-sm !font-semibold !text-blue-600 hover:!bg-blue-50",
					cancelButton: "!h-8 !rounded-md !bg-transparent !px-2.5 !text-sm !font-medium !text-neutral-600 hover:!bg-neutral-100",
					closeButton: "!border-neutral-200 !bg-white !text-neutral-500 hover:!text-neutral-900",
				},
			}}
		/>
	);
}
