export type MailboxRouteParams = {
	params: Promise<{ id: string }>;
};

export type MailboxUpdateValues = {
	displayName?: string | null;
	signature?: string | null;
	defaultFrom?: string | null;
	useAllDomains?: boolean;
};
