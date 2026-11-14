import {
	Bell,
	Clock,
	DatabaseBackup,
	EyeOff,
	FileText,
	FolderInput,
	Globe2,
	Inbox,
	Keyboard,
	KeyRound,
	ListChecks,
	MailCheck,
	MailPlus,
	Route,
	Send,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	Trash2,
} from "@/components/icons";
import type { HomeAction, LandingFaq, LandingItem, LandingNavItem, MailPreview, SidebarItem } from "./types";

export const landingNavItems: LandingNavItem[] = [
	{ href: "#features", labelKey: "Features" },
	{ href: "#pricing", labelKey: "Pricing" },
	{ href: "#faq", labelKey: "FAQ" },
];

export const sidebarItems: SidebarItem[] = [
	{ labelKey: "Inbox", icon: Inbox, active: true, count: "4" },
	{ labelKey: "Sent", icon: Send },
	{ labelKey: "Drafts", icon: FileText, count: "1" },
	{ labelKey: "Spam", icon: ShieldAlert },
	{ labelKey: "Trash", icon: Trash2 },
];

export const heroMessages: MailPreview[] = [
	{
		icon: MailCheck,
		sender: "Elena Rostova",
		subjectKey: "hello@acme.io is live",
		previewKey: "Added 4 teammates with shared support@ access.",
		badgeKey: "Team",
	},
	{
		icon: MailCheck,
		sender: "Stripe Billing",
		subjectKey: "Invoice #4092 paid",
		previewKey: "Your Pro workspace receipt is ready to view.",
		badgeKey: "Receipt",
	},
	{
		icon: MailCheck,
		sender: "DNS Monitor",
		subjectKey: "MX, SPF & DMARC verified",
		previewKey: "All outbound records passed for acme.io.",
		badgeKey: "Verified",
	},
	{
		icon: MailCheck,
		sender: "Marcus Vance",
		subjectKey: "Re: Partner deck",
		previewKey: "Attached the 12 MB PDF via workspace S3.",
		badgeKey: "12 MB",
	},
];

export const features: LandingItem[] = [
	{ icon: Globe2, titleKey: "Verified domains & team mailboxes", bodyKey: "Connect your custom domains, verify MX, SPF, and DMARC live, and create team mailboxes and aliases in seconds." },
	{ icon: Route, titleKey: "Workspace isolation & quotas", bodyKey: "Each organization gets an isolated workspace with real-time tracking for domains, mailboxes, S3 storage, and daily sends." },
	{ icon: ShieldCheck, titleKey: "Spam stays out", bodyKey: "Layered scoring checks authentication, reputation, impersonation and links, and learns from what you mark as spam." },
	{ icon: Clock, titleKey: "Conversations, snooze and schedule", bodyKey: "Threaded conversations, snooze until later, schedule sends and a configurable undo window keep your inbox under control." },
	{ icon: Bell, titleKey: "Never miss a reply", bodyKey: "Set a follow-up reminder when you send. If nobody answers, the message comes back to the top of your inbox." },
	{ icon: FolderInput, titleKey: "Move in over lunch", bodyKey: "Import from a Gmail export or email backup files in the background, with folders, threads and contacts intact." },
];

export const steps: LandingItem[] = [
	{ icon: Globe2, titleKey: "Pick a plan & verify DNS", bodyKey: "Choose Starter, Pro, or Business, enter your domain, and verify MX, SPF, and DMARC records before signup." },
	{ icon: MailPlus, titleKey: "Create your workspace", bodyKey: "Once DNS is verified, create your owner account and provision mailboxes for your team." },
	{ icon: Send, titleKey: "Send and receive", bodyKey: "Mail flows right away on the web or as an installable app on phone and desktop." },
];

export const securityPoints: LandingItem[] = [
	{ icon: KeyRound, titleKey: "Two-step verification", bodyKey: "Protect your account with TOTP authenticator codes and emergency recovery codes." },
	{ icon: EyeOff, titleKey: "Remote content blocked", bodyKey: "Tracking images stay off until you choose to load them, per message or per sender." },
	{ icon: ListChecks, titleKey: "Audit logs and activity", bodyKey: "See who signed in, what changed and when, across every account." },
	{ icon: DatabaseBackup, titleKey: "Scheduled backups", bodyKey: "Automatic backups of your mail and settings, ready to restore when you need them." },
];

export const everywherePoints: Pick<LandingItem, "icon" | "titleKey">[] = [
	{ icon: Bell, titleKey: "Instant push notifications" },
	{ icon: Smartphone, titleKey: "Installable web app" },
	{ icon: MailCheck, titleKey: "Ultra-fast search & keyboard nav" },
	{ icon: Keyboard, titleKey: "Keyboard shortcuts throughout" },
];

export const faqs: LandingFaq[] = [
	{
		questionKey: "How much does it cost?",
		answerKey:
			"$0.50 per mailbox per month on yearly billing ($0.55 for 6 months, $0.60 for 3 months), with a minimum of 5 mailboxes. Every mailbox gets 1 GB of storage, and up to 5 custom domains are included at no extra cost.",
	},
	{
		questionKey: "Can teammates share support@ or sales@?",
		answerKey:
			"Yes. Share any mailbox with teammates and give each person Full access, Send as, Send on behalf or Read only.",
	},
	{
		questionKey: "Do I need to know DNS?",
		answerKey:
			"No. We show the exact MX, SPF, DKIM and DMARC records to add, check them live and tell you when everything is correct.",
	},
	{
		questionKey: "Can I bring my existing email?",
		answerKey:
			"Yes. Upload a Google Takeout or mbox export and it imports in the background, keeping folders and conversations together.",
	},
	{
		questionKey: "Do you read or sell my email?",
		answerKey:
			"No. There are no ads, we never scan your mail for marketing and we never build profiles from it.",
	},
	{
		questionKey: "Does it work on my phone?",
		answerKey:
			"Yes. Use it in any browser, or install it as an app on iPhone, Android, Mac or Windows to get push notifications.",
	},
];

export function getHomeActions(isLoggedIn: boolean): HomeAction[] {
	if (isLoggedIn) {
		return [{ href: "/inbox", labelKey: "Dashboard", variant: "default" }];
	}

	return [
		{ href: "/login", labelKey: "Log in", variant: "ghost" },
		{ href: "/register", labelKey: "Create account", variant: "default" },
	];
}
