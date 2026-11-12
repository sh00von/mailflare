import { settingsNavSections } from "@/components/settings/settings-nav-utils";

const staticRouteTitles: Array<[string, string]> = [
	["/settings", "Settings"],
	["/admin", "Admin settings"],
	["/mailboxes", "Mailboxes"],
	["/domains", "Domains"],
	["/routing", "Routing"],
	["/spam-filter", "Spam filter"],
	["/api-keys", "API keys"],
	["/general", "General"],
	["/agent", "Agent"],
	["/accounts", "Accounts"],
	["/activity", "Activity"],
	["/backups", "Backups"],
	["/branding", "Branding"],
	["/licenses", "Licenses"],
	["/ai-usage", "AI Usage"],
	["/calendar", "Calendar"],
	["/booking", "Bookings"],
	["/drive", "Drive"],
	["/compose", "Compose"],
];

const routeTitles: Array<[string, string]> = [
	...staticRouteTitles,
	...settingsNavSections.flatMap((section) => section.items.map((item): [string, string] => [item.href, item.labelKey])),
];

export function getRouteTitleKey(pathname: string): string | null {
	let best: [string, string] | null = null;
	for (const entry of routeTitles) {
		const [path] = entry;
		if (pathname !== path && !pathname.startsWith(`${path}/`)) continue;
		if (!best || path.length > best[0].length) best = entry;
	}
	return best ? best[1] : null;
}
