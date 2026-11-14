"use client";

import { MailPlus } from "@/components/icons";
import { usePathname, useRouter } from "next/navigation";
import { ComposeForm } from "@/components/compose/compose-form";
import { useCompose } from "@/components/compose/compose-context";
import { useSidebar } from "@/components/sidebar-state";

/** `showButton` adds the phone Compose button; only the dashboard pages (mail) pass it. */
export function FloatingComposer({ showButton = false }: { showButton?: boolean }) {
	const { open, draftId, openComposer, closeComposer } = useCompose();
	const pathname = usePathname();
	const router = useRouter();
	const { mobileOpen } = useSidebar();
	return (
		<>
			{showButton && !open && !mobileOpen && (
				<button
					type="button"
					onClick={openComposer}
					aria-label={"Compose"}
					className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-3 h-14 rounded-2xl bg-compose px-5 text-base font-medium text-on-compose shadow-md transition-shadow hover:shadow-lg active:shadow-sm md:hidden"
				>
					<MailPlus size={19} />
					Compose
				</button>
			)}
			{open && <ComposeForm key={draftId ?? "new"} mode="popup" draftIdToLoad={draftId} onClose={() => {
				closeComposer();
				if (/^\/drafts\/[^/]+\/?$/.test(pathname)) router.replace("/drafts");
			}} />}
		</>
	);
}
