import type { BrandingView } from "./types";

export const DEFAULT_BRANDING: BrandingView = {
	appName: "Replyot",
	hasCustomIcon: false,
	canCustomizeBranding: false,
};

export async function getBranding(_env?: CloudflareEnv): Promise<BrandingView> {
	return DEFAULT_BRANDING;
}

export async function getBrandingView(_env?: CloudflareEnv): Promise<BrandingView> {
	return DEFAULT_BRANDING;
}
