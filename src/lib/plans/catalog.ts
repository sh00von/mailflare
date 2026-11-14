export type PlanId = "starter" | "pro" | "business";
export type WorkspaceStatus = "trialing" | "active" | "suspended";
export type BillingCycle = "3m" | "6m" | "12m";

export type PlanDefinition = {
	id: PlanId;
	name: string;
	tagline: string;
	priceMonthlyUsd: number;
	priceQuarterlyUsd: number;
	priceSemiAnnualUsd: number;
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
};

export type AddonDefinition = {
	id: string;
	name: string;
	description: string;
	priceQuarterlyUsd: number;
	priceAnnualUsd: number;
	priceMonthlyEquivalent: number;
};

export const ADDONS_CATALOG: AddonDefinition[] = [
	{
		id: "addon_mailbox_storage_1gb",
		name: "Mailbox Storage Booster (+1 GB)",
		description: "Add 1 GB dedicated storage directly to a specific team mailbox",
		priceQuarterlyUsd: 1.0,
		priceAnnualUsd: 3.0,
		priceMonthlyEquivalent: 0.25,
	},
	{
		id: "addon_mailbox_1gb",
		name: "Extra Team Mailbox (+1 GB)",
		description: "Add 1 additional team mailbox with 1 GB dedicated storage included",
		priceQuarterlyUsd: 1.5,
		priceAnnualUsd: 6.0,
		priceMonthlyEquivalent: 0.5,
	},
];

const GIB = 1024 ** 3;
export const TRIAL_DAYS = 0;
export const MIN_MAILBOXES = 5;

export type PricingCalculation = {
	mailboxes: number;
	cycle: BillingCycle;
	pricePerMailboxMonthly: number;
	totalMonthlyEquivalent: number;
	totalCharged: number;
	storageGb: number;
	billingText: string;
};

export function calculateWorkspacePricing(mailboxesCount: number, cycle: BillingCycle = "12m"): PricingCalculation {
	const count = Math.max(MIN_MAILBOXES, Math.floor(mailboxesCount || MIN_MAILBOXES));

	let pricePerMailboxMonthly = 0.5; // $0.50 / mailbox / mo on 12m ($30/yr for 5)
	let totalCharged = 0;
	let billingText = "";

	if (cycle === "3m") {
		// Quarterly: $0.60 / mailbox / mo ($9 / quarter for 5)
		pricePerMailboxMonthly = 0.6;
		totalCharged = Number((count * pricePerMailboxMonthly * 3).toFixed(2));
		billingText = `Billed $${totalCharged.toFixed(2)} every 3 months`;
	} else if (cycle === "6m") {
		// Semi-annual: $0.55 / mailbox / mo ($16.50 / 6mo for 5)
		pricePerMailboxMonthly = 0.55;
		totalCharged = Number((count * pricePerMailboxMonthly * 6).toFixed(2));
		billingText = `Billed $${totalCharged.toFixed(2)} every 6 months`;
	} else {
		// 12m Annual: $0.50 / mailbox / mo ($30 / yr for 5)
		pricePerMailboxMonthly = 0.5;
		totalCharged = Number((count * pricePerMailboxMonthly * 12).toFixed(2));
		billingText = `Billed $${totalCharged.toFixed(2)} yearly`;
	}

	const totalMonthlyEquivalent = Number((count * pricePerMailboxMonthly).toFixed(2));

	return {
		mailboxes: count,
		cycle,
		pricePerMailboxMonthly,
		totalMonthlyEquivalent,
		totalCharged,
		storageGb: count, // 1 GB dedicated per mailbox!
		billingText,
	};
}

export const WORKSPACE_PLAN: PlanDefinition = {
	id: "pro",
	name: "Replyot Workspace",
	tagline: "Professional business email with 5 team mailboxes & 5 domains",
	priceMonthlyUsd: 2.5,
	priceQuarterlyUsd: 9.0,
	priceSemiAnnualUsd: 16.5,
	priceAnnualUsd: 30.0,
	maxDomains: 5,
	maxMailboxes: 5,
	storageLimitBytes: 5 * GIB,
	storagePerMailboxBytes: 1 * GIB,
	storageLabel: "5 GB (1 GB / mailbox)",
	dailySendLimit: 500, // Gmail matched
	hourlySendLimit: 100, // Gmail burst protection
	maxAttachmentMb: 25,
	highlighted: true,
};

export const PLANS: Record<PlanId, PlanDefinition> = {
	starter: {
		...WORKSPACE_PLAN,
		id: "starter",
		name: "Replyot Workspace",
	},
	pro: {
		...WORKSPACE_PLAN,
		id: "pro",
		name: "Replyot Workspace",
	},
	business: {
		...WORKSPACE_PLAN,
		id: "business",
		name: "Replyot Workspace",
	},
};

export const PLAN_LIST: PlanDefinition[] = [PLANS.pro];

export function resolvePlanId(value: unknown): PlanId {
	return value === "starter" || value === "business" ? value : "pro";
}

export function getPlanDefinition(plan: PlanId): PlanDefinition {
	return PLANS[plan] ?? PLANS.pro;
}
