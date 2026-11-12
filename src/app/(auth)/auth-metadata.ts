import type { Metadata } from "next";
import { getHomeBranding } from "@/app/home-server-utils";

export async function authPageMetadata(titleKey: string): Promise<Metadata> {
	const { appName } = await getHomeBranding();
	return { title: `${titleKey} - ${appName}` };
}
