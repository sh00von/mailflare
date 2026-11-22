import type { Mailer } from "./mailer";
import type { MailflareQueue } from "./queue";
import type { RealtimeHubRegistry } from "./realtime";

export type NodeRuntime = {
	env: CloudflareEnv;
	dataDir: string;
	database?: undefined;
	mailer: Mailer;
	inboundQueue: MailflareQueue;
	outboundQueue: MailflareQueue;
	realtime: RealtimeHubRegistry;
};
