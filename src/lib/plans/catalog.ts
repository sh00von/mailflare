export type PlanId = "free" | "starter" | "pro" | "business";
export type WorkspaceStatus = "trialing" | "active" | "suspended";
export type BillingCycle = "monthly" | "yearly";

export type PlanDefinition = {
	id: PlanId;
	name: string;
	tagline: string;
	priceMonthlyUsd: number;
	priceAnnualUsd: number;
	maxDomains: number;
	maxMailboxes: number;
	storageLimitBytes: number;
	storagePerMailboxBytes: number;
	storageLabel: string;
	dailySendLimit: number;
	hourlySendLimit: number;
	maxAttachmentMb: number;
	highlighted?: boolean;
	features: string[];
};

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, PlanDefinition> = {
	free: {
		id: "free",
		name: "Free Forever",
		tagline: "Essential custom domain webmail for personal use & developers",
		priceMonthlyUsd: 0,
		priceAnnualUsd: 0,
		maxDomains: 1,
		maxMailboxes: 1,
		storageLimitBytes: 500 * MIB,
		storagePerMailboxBytes: 500 * MIB,
		storageLabel: "500 MB",
		dailySendLimit: 50,
		hourlySendLimit: 20,
		maxAttachmentMb: 15,
		features: [
			"1 Custom Domain",
			"1 Mailbox (500 MB Storage)",
			"SPF, DKIM & DMARC Deliverability",
			"Modern Webmail & Mobile PWA",
			"50 Emails / day",
		],
	},
	starter: {
		id: "starter",
		name: "Starter",
		tagline: "Perfect for solo founders, freelancers & independent creators",
		priceMonthlyUsd: 1.99,
		priceAnnualUsd: 19.0, // ~$1.58/mo (~17% discount)
		maxDomains: 1,
		maxMailboxes: 2,
		storageLimitBytes: 2 * GIB,
		storagePerMailboxBytes: 1 * GIB,
		storageLabel: "2 GB (1 GB / mailbox)",
		dailySendLimit: 200,
		hourlySendLimit: 50,
		maxAttachmentMb: 25,
		features: [
			"1 Custom Domain",
			"Up to 2 Team Mailboxes",
			"2 GB Dedicated Storage (1 GB/mailbox)",
			"Unlimited Email Aliases",
			"Custom Email Signatures",
			"200 Emails / day",
		],
	},
	pro: {
		id: "pro",
		name: "Pro Workspace",
		tagline: "High-performance email workspace for startups and growing teams",
		priceMonthlyUsd: 4.99,
		priceAnnualUsd: 49.0, // ~$4.08/mo (~17% discount)
		maxDomains: 3,
		maxMailboxes: 5,
		storageLimitBytes: 10 * GIB,
		storagePerMailboxBytes: 2 * GIB,
		storageLabel: "10 GB (2 GB / mailbox)",
		dailySendLimit: 500,
		hourlySendLimit: 100,
		maxAttachmentMb: 25,
		highlighted: true,
		features: [
			"Up to 3 Custom Domains",
			"Up to 5 Team Mailboxes",
			"10 GB Storage (2 GB / mailbox)",
			"Auto-forwarding & Blocklists",
			"Priority Inbound & Outbound Delivery",
			"500 Emails / day (Gmail matched)",
			"24/7 Deliverability Health Monitoring",
		],
	},
	business: {
		id: "business",
		name: "Business",
		tagline: "Expanded capacity and dedicated spam defense for organizations",
		priceMonthlyUsd: 9.99,
		priceAnnualUsd: 99.0, // ~$8.25/mo (~17% discount)
		maxDomains: 10,
		maxMailboxes: 15,
		storageLimitBytes: 30 * GIB,
		storagePerMailboxBytes: 2 * GIB,
		storageLabel: "30 GB (2 GB / mailbox)",
		dailySendLimit: 1500,
		hourlySendLimit: 300,
		maxAttachmentMb: 50,
		features: [
			"Up to 10 Custom Domains",
			"Up to 15 Team Mailboxes",
			"30 GB Storage (2 GB / mailbox)",
			"Dedicated Spam Reputation & Filters",
			"1,500 Emails / day High Throughput",
			"Audit Logs & Compliance Backups",
			"Priority Engineering Support",
		],
	},
};

export const PLAN_LIST: PlanDefinition[] = [
	PLANS.free,
	PLANS.starter,
	PLANS.pro,
	PLANS.business,
];

export const PAID_PLAN_LIST: PlanDefinition[] = [
	PLANS.starter,
	PLANS.pro,
	PLANS.business,
];

export function resolvePlanId(value: unknown): PlanId {
	if (value === "free" || value === "starter" || value === "pro" || value === "business") {
		return value;
	}
	return "pro";
}

export function resolveBillingCycle(value: unknown): BillingCycle {
	if (value === "yearly" || value === "12m" || value === "annual") {
		return "yearly";
	}
	return "monthly";
}

export function getPlanDefinition(plan: unknown): PlanDefinition {
	const id = resolvePlanId(plan);
	return PLANS[id] ?? PLANS.pro;
}

export type PricingCalculation = {
	plan: PlanDefinition;
	cycle: BillingCycle;
	totalCharged: number;
	monthlyEquivalent: number;
	discountPct: number;
	billingText: string;
};

export function calculatePlanPricing(planId: PlanId, cycle: BillingCycle = "monthly"): PricingCalculation {
	const plan = getPlanDefinition(planId);

	if (plan.id === "free") {
		return {
			plan,
			cycle,
			totalCharged: 0,
			monthlyEquivalent: 0,
			discountPct: 0,
			billingText: "Free forever",
		};
	}

	if (cycle === "yearly") {
		const totalCharged = plan.priceAnnualUsd;
		const monthlyEquivalent = Number((totalCharged / 12).toFixed(2));
		const standardYearly = plan.priceMonthlyUsd * 12;
		const discountPct = Math.round(((standardYearly - totalCharged) / standardYearly) * 100);
		return {
			plan,
			cycle,
			totalCharged,
			monthlyEquivalent,
			discountPct,
			billingText: `Billed $${totalCharged.toFixed(2)} yearly (~$${monthlyEquivalent.toFixed(2)}/mo)`,
		};
	}

	const totalCharged = plan.priceMonthlyUsd;
	return {
		plan,
		cycle,
		totalCharged,
		monthlyEquivalent: totalCharged,
		discountPct: 0,
		billingText: `Billed $${totalCharged.toFixed(2)} monthly`,
	};
}
