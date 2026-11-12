import type { LucideIcon } from "@/components/icons";
import type { ReactNode } from "react";

export type AuthShellStep = {
	label: string;
	active: boolean;
	/** A finished step shows a check mark. */
	done?: boolean;
};

export type AuthShellProps = {
	icon: LucideIcon;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	steps?: AuthShellStep[];
	/** Widen the card for steps with more content, such as DNS records. */
	wide?: boolean;
};
