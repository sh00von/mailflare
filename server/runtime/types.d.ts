import type { Mailer } from "./mailer";
import type { InProcessQueue } from "./queue";
import type { RealtimeHubRegistry } from "./realtime";
export type NodeRuntime = {
	env: CloudflareEnv;
	dataDir: string;
	database?: undefined;
	mailer: Mailer;
	inboundQueue: InProcessQueue;
	outboundQueue: InProcessQueue;
	agentQueue: InProcessQueue;
	realtime: RealtimeHubRegistry;
};
