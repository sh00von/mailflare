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
	{ href: "#how-it-works", labelKey: "How it works" },
	{ href: "#security", labelKey: "Security" },
	{ href: "#faq", labelKey: "FAQ" },
];

export const sidebarItems: SidebarItem[] = [
	{ labelKey: "Inbox", icon: Inbox, active: true, count: "12" },
	{ labelKey: "Sent", icon: Send },
	{ labelKey: "Drafts", icon: FileText, count: "2" },
	{ labelKey: "Spam", icon: ShieldAlert },
	{ labelKey: "Trash", icon: Trash2 },
];

export const heroMessages: MailPreview[] = [
	{
		icon: MailCheck,
		sender: "Ava Martinez",
		subjectKey: "Welcome aboard",
		previewKey: "Your support@ mailbox is live and receiving mail.",
		badgeKey: "New",
	},
	{
		icon: MailCheck,
		sender: "Noah Chen",
		subjectKey: "Q3 contract, signed",
		previewKey: "Attached is the countersigned copy for your records.",
		badgeKey: "Reply",
	},
	{
		icon: MailCheck,
		sender: "Build bot",
		subjectKey: "Deploy finished",
		previewKey: "Build 482 rolled out to production with no errors.",
		badgeKey: "Alert",
	},
	{
		icon: MailCheck,
		sender: "Priya Shah",
		subjectKey: "Lunch on Friday?",
		previewKey: "Booked a table for six at noon, let me know if that works.",
		badgeKey: "Team",
	},
];

/** Real integrations, shown as plain wordmarks rather than borrowed logos. */
export const providerNames = ["Cloudflare", "Amazon SES", "Resend", "PostgreSQL", "MySQL", "SQLite"];

export const features: LandingItem[] = [
	{ icon: Globe2, titleKey: "Your domains, your addresses", bodyKey: "Add any number of domains, then create mailboxes, aliases and catch-alls. DNS status shows exactly what is left to set up." },
	{ icon: Route, titleKey: "Routing rules that think ahead", bodyKey: "Forward, reject or file mail by sender and recipient, at the domain or the mailbox, without ever shadowing a real address." },
	{ icon: ShieldCheck, titleKey: "Spam stays out", bodyKey: "Layered scoring checks authentication, reputation, impersonation and links, and learns from what you mark as spam." },
	{ icon: Clock, titleKey: "Conversations, snooze and schedule", bodyKey: "Threaded conversations, snooze until later, schedule sends and a configurable undo window keep your inbox under control." },
	{ icon: Bell, titleKey: "Never miss a reply", bodyKey: "Set a follow-up reminder when you send. If nobody answers, the message comes back to the top of your inbox." },
	{ icon: FolderInput, titleKey: "Move in over lunch", bodyKey: "Import from any IMAP account or a Gmail export in the background, with folders, threads and contacts intact." },
];

export const steps: LandingItem[] = [
	{ icon: Globe2, titleKey: "Add your domain", bodyKey: "Connect a domain and follow the guided DNS checklist. Records turn green as they verify." },
	{ icon: MailPlus, titleKey: "Create mailboxes", bodyKey: "Set up personal and shared mailboxes, aliases and routing rules for every team." },
	{ icon: Send, titleKey: "Send and receive", bodyKey: "Mail flows right away, on the web, as an installable app, or in your favourite mail client." },
];

export const securityPoints: LandingItem[] = [
	{ icon: KeyRound, titleKey: "Passkeys and authenticator codes", bodyKey: "Sign in with a passkey, or add TOTP two-factor with recovery codes." },
	{ icon: EyeOff, titleKey: "Remote content blocked", bodyKey: "Tracking images stay off until you choose to load them, per message or per sender." },
	{ icon: ListChecks, titleKey: "Audit logs and activity", bodyKey: "See who signed in, what changed and when, across every account." },
	{ icon: DatabaseBackup, titleKey: "Scheduled backups", bodyKey: "Automatic backups of your mail and settings, ready to restore when you need them." },
];

export const everywherePoints: Pick<LandingItem, "icon" | "titleKey">[] = [
	{ icon: Bell, titleKey: "Instant push notifications" },
	{ icon: Smartphone, titleKey: "Installable web app" },
	{ icon: MailCheck, titleKey: "JMAP for native mail apps" },
	{ icon: Keyboard, titleKey: "Keyboard shortcuts throughout" },
];

export const faqs: LandingFaq[] = [
	{ questionKey: "Can I use my existing domain?", answerKey: "Yes. Add the domain, publish the DNS records shown in the checklist, and you can send and receive as soon as they verify." },
	{ questionKey: "How do I bring my old email over?", answerKey: "Use the importer to pull mail from any IMAP server or upload a Gmail export. Imports run in the background and can be resumed if interrupted." },
	{ questionKey: "Can several people share one mailbox?", answerKey: "Yes. Share a mailbox like support@ with teammates and choose per person: read-only, send as, send on behalf, or full access." },
	{ questionKey: "Does it work on my phone?", answerKey: "Install the web app on your home screen for push notifications, or connect a mail client that speaks JMAP." },
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
