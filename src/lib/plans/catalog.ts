import { config } from "@/lib/config";

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
	features: readonly string[] | string[];
};

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, PlanDefinition> = {
	free: {
		...config.plans.free,
	},
	starter: {
		...config.plans.starter,
	},
	pro: {
		...config.plans.pro,
	},
	business: {
		...config.plans.business,
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

export type AddonId = "addon_mailboxes" | "addon_storage";

export type AddonDefinition = {
	id: AddonId;
	name: string;
	tagline: string;
	description: string;
	priceMonthlyUsd: number;
	priceAnnualUsd: number;
	unitLabel: string;
	extraMailboxes: number;
	extraStorageGb: number;
	extraStorageBytes: number;
	badge?: string;
};

export const ADDONS: Record<AddonId, AddonDefinition> = {
	addon_mailboxes: {
		id: "addon_mailboxes",
		name: "+5 Team Mailboxes",
		tagline: "Expand team collaboration with 5 dedicated inboxes",
		description: "Add 5 additional full-featured team mailboxes with separate credentials, IMAP/SMTP submission, and webmail access.",
		priceMonthlyUsd: 3.0,
		priceAnnualUsd: 30.0,
		unitLabel: "5 mailboxes",
		extraMailboxes: 5,
		extraStorageGb: 0,
		extraStorageBytes: 0,
		badge: "Most Popular",
	},
	addon_storage: {
		id: "addon_storage",
		name: "+20 GB Storage",
		tagline: "High-speed NVMe / S3 storage capacity boost",
		description: "Add 20 GB of secure attachment and message storage across all workspace domains and accounts with zero egress fees.",
		priceMonthlyUsd: 2.5,
		priceAnnualUsd: 25.0,
		unitLabel: "20 GB storage",
		extraMailboxes: 0,
		extraStorageGb: 20,
		extraStorageBytes: 20 * 1024 * 1024 * 1024,
		badge: "High Value",
	},
};

export const ADDON_LIST: AddonDefinition[] = [
	ADDONS.addon_mailboxes,
	ADDONS.addon_storage,
];

export const ADDONS_CATALOG = ADDON_LIST;

export function resolveAddonId(value: unknown): AddonId | null {
	if (value === "addon_mailboxes" || value === "addon_extra_mailboxes" || value === "mailboxes") {
		return "addon_mailboxes";
	}
	if (value === "addon_storage" || value === "addon_extra_storage" || value === "storage") {
		return "addon_storage";
	}
	return null;
}

export function getAddonDefinition(id: unknown): AddonDefinition | null {
	const resolved = resolveAddonId(id);
	return resolved ? ADDONS[resolved] : null;
}

export type AddonPricingCalculation = {
	addon: AddonDefinition;
	cycle: BillingCycle;
	totalCharged: number;
	monthlyEquivalent: number;
	discountPct: number;
	billingText: string;
};

export function calculateAddonPricing(addonId: AddonId, cycle: BillingCycle = "monthly"): AddonPricingCalculation {
	const addon = ADDONS[addonId];
	if (cycle === "yearly") {
		const totalCharged = addon.priceAnnualUsd;
		const monthlyEquivalent = Number((totalCharged / 12).toFixed(2));
		const standardYearly = addon.priceMonthlyUsd * 12;
		const discountPct = Math.round(((standardYearly - totalCharged) / standardYearly) * 100);
		return {
			addon,
			cycle,
			totalCharged,
			monthlyEquivalent,
			discountPct,
			billingText: `Billed $${totalCharged.toFixed(2)} yearly (~$${monthlyEquivalent.toFixed(2)}/mo)`,
		};
	}

	const totalCharged = addon.priceMonthlyUsd;
	return {
		addon,
		cycle,
		totalCharged,
		monthlyEquivalent: totalCharged,
		discountPct: 0,
		billingText: `Billed $${totalCharged.toFixed(2)} monthly`,
	};
}

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
