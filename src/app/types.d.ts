import type { LucideIcon } from "@/components/icons";
import type { ButtonProps } from "@/components/ui/button";
import type { MailboxSelectorUser } from "@/components/mailbox-selector-types";
import type { ReactNode } from "react";

export type HomeAuthProviderProps = {
	children: ReactNode;
	/**
	 * The account resolved from the session cookie on the server. `undefined`
	 * means the server did not answer, so the provider must check itself.
	 */
	initialUser?: MailboxSelectorUser | null;
};

export type HomeAccountMenuProps = {
	user: MailboxSelectorUser;
};

export type HomeAction = {
	href: string;
	labelKey: string;
	variant: ButtonProps["variant"];
};

export type LandingNavItem = {
	href: string;
	labelKey: string;
};

export type SidebarItem = {
	labelKey: string;
	icon: LucideIcon;
	active?: boolean;
	count?: string;
};

export type MailPreview = {
	icon: LucideIcon;
	sender: string;
	subjectKey: string;
	previewKey: string;
	badgeKey: string;
};

/** A titled card on the landing page: features, security points and steps. */
export type LandingItem = {
	icon: LucideIcon;
	titleKey: string;
	bodyKey: string;
};

export type LandingFaq = {
	questionKey: string;
	answerKey: string;
};
