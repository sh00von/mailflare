"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBranding } from "@/components/branding-provider";
import { getRouteTitleKey } from "./route-title-utils";

export function RouteTitle() {
	const pathname = usePathname();
	const { appName } = useBranding();
	const key = getRouteTitleKey(pathname);
	const title = key ? `${key} - ${appName}` : null;

	useEffect(() => {
		if (title) document.title = title;
	}, [title]);

	return null;
}
