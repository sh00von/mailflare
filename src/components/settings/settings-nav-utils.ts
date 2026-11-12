import type { SettingsNavSection } from "./settings-nav-types";

export const settingsNavSections: SettingsNavSection[] = [
	{
		labelKey: "Settings",
		items: [
			{
				href: "/settings/account",
				labelKey: "Account",
			},
			{
				href: "/settings/inbox",
				labelKey: "Inbox",
			},
			{
				href: "/settings/security",
				labelKey: "Security",
			},
			{
				href: "/settings/app-passwords",
				labelKey: "App passwords",
			},
		],
	},
	{
		labelKey: "Mailbox",
		items: [
			{
				href: "/settings/import",
				labelKey: "Import",
			},
			{
				href: "/settings/export",
				labelKey: "Export",
			},
		],
	},
];

export function isActiveSettingsPath(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}
