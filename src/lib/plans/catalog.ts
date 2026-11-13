export type PlanId = "starter" | "pro" | "business";
export type WorkspaceStatus = "trialing" | "active" | "suspended";

export type PlanDefinition = {
	id: PlanId;
	name: string;
	tagline: string;
	priceMonthlyUsd: number;
	maxDomains: number;
	maxMailboxes: number;
	storageLimitBytes: number;
	storageLabel: string;
	dailySendLimit: number;
	maxAttachmentMb: number;
	highlighted?: boolean;
};

const GIB = 1024 ** 3;
export const TRIAL_DAYS = 0;

export const PLANS: Record<PlanId, PlanDefinition> = {
	starter: {
		id: "starter",
		name: "Starter",
		tagline: "For solo founders & small domains",
		priceMonthlyUsd: 5,
		maxDomains: 1,
		maxMailboxes: 3,
		storageLimitBytes: 10 * GIB,
		storageLabel: "10 GB",
		dailySendLimit: 300,
		maxAttachmentMb: 15,
	},
	pro: {
		id: "pro",
		name: "Pro",
		tagline: "For growing teams & agencies",
		priceMonthlyUsd: 15,
		maxDomains: 5,
		maxMailboxes: 15,
		storageLimitBytes: 50 * GIB,
		storageLabel: "50 GB",
		dailySendLimit: 1500,
		maxAttachmentMb: 25,
		highlighted: true,
	},
	business: {
		id: "business",
		name: "Business",
		tagline: "For multi-brand organizations",
		priceMonthlyUsd: 39,
		maxDomains: 20,
		maxMailboxes: 50,
		storageLimitBytes: 200 * GIB,
		storageLabel: "200 GB",
		dailySendLimit: 5000,
		maxAttachmentMb: 25,
	},
};

export const PLAN_LIST: PlanDefinition[] = [PLANS.starter, PLANS.pro, PLANS.business];

export function resolvePlanId(value: unknown): PlanId {
	return value === "pro" || value === "business" ? value : "starter";
}

export function getPlanDefinition(plan: PlanId): PlanDefinition {
	return PLANS[plan] ?? PLANS.starter;
}

