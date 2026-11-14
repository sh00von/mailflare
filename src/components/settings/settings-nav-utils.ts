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
		],
	},
	{
		labelKey: "Mailbox",
		items: [
			{
				href: "/settings/aliases",
				labelKey: "Aliases",
			},
			{
				href: "/settings/forwarding",
				labelKey: "Forwarding",
			},
			{
				href: "/settings/storage",
				labelKey: "Storage",
			},
			{
				href: "/settings/blocklist",
				labelKey: "Blocked Senders",
			},
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
