export type LicensePlan = "community" | "pro" | "team";

export type LicenseState = "active";

export type LicenseEntitlements = {
	plan: LicensePlan;
	canCustomizeBranding: boolean;
	canManageAccounts: boolean;
	canShareMailboxes: boolean;
	accountSeatLimit: number | null;
	canForwardEmail: boolean;
};
