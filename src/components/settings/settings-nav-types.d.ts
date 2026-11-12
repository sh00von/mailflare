
export type SettingsNavItem = {
	href: string;
	labelKey: string;
	requiresMailboxAccess?: boolean;
};

export type SettingsNavSection = {
	labelKey: string;
	items: SettingsNavItem[];
};
