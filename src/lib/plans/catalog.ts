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
