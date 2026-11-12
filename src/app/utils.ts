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
	{ icon: FolderInput, titleKey: "Move in over lunch", bodyKey: "Import from any IMAP account or a Gmail export in the background, with folders, threads and contacts intact." },
];

export const steps: LandingItem[] = [
	{ icon: Globe2, titleKey: "Pick a plan & verify DNS", bodyKey: "Choose Starter, Pro, or Business, enter your domain, and verify MX, SPF, and DMARC records before signup." },
	{ icon: MailPlus, titleKey: "Create your workspace", bodyKey: "Once DNS is verified, create your owner account and provision mailboxes for your team." },
	{ icon: Send, titleKey: "Send and receive", bodyKey: "Mail flows right away, on the web, as an installable app, or in your favourite JMAP mail client." },
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
	{ questionKey: "Is there a free trial?", answerKey: "Yes. Every plan—Starter ($5/mo), Pro ($15/mo), and Business ($39/mo)—includes a 14-day free trial with full access to your plan's limits." },
	{ questionKey: "Why do I verify DNS before creating an account?", answerKey: "Verifying MX, SPF, and DMARC upfront proves domain ownership and prevents anyone else from claiming your domain on Replyot." },
	{ questionKey: "Can several people share one mailbox?", answerKey: "Yes. Share a mailbox like support@ with teammates and choose per person: read-only, send as, send on behalf, or full access." },
	{ questionKey: "What happens if my team hits a plan limit?", answerKey: "Your workspace tracks domains, mailboxes, S3 storage, and daily sends in real time. You can upgrade your plan anytime from the admin panel." },
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
