import { Queue as BullQueue, Worker as BullWorker, type ConnectionOptions } from "bullmq";
import Redis from "ioredis";

export type QueueConsumer = (body: unknown) => Promise<void>;

type Pending = { body: unknown; attempts: number };

export interface MailflareQueue {
	readonly name: string;
	setConsumer(consumer: QueueConsumer): void;
	send(body: unknown, options?: { delaySeconds?: number }): Promise<void>;
	sendBatch(messages: Iterable<{ body: unknown; delaySeconds?: number }>): Promise<void>;
	metrics(): Promise<{ backlogCount: number }>;
	stop(): void | Promise<void>;
}

export class InProcessQueue implements MailflareQueue {
	private consumer: QueueConsumer | null = null;
	private readonly maxRetries: number;
	private readonly timers = new Set<ReturnType<typeof setTimeout>>();

	constructor(readonly name: string, options?: { maxRetries?: number }) {
		this.maxRetries = options?.maxRetries ?? 3;
	}

	setConsumer(consumer: QueueConsumer) {
		this.consumer = consumer;
	}

	async send(body: unknown, options?: { delaySeconds?: number }) {
		this.schedule({ body, attempts: 0 }, (options?.delaySeconds ?? 0) * 1000);
	}

	async sendBatch(messages: Iterable<{ body: unknown; delaySeconds?: number }>) {
		for (const message of messages) await this.send(message.body, { delaySeconds: message.delaySeconds });
	}

	async metrics() {
		return { backlogCount: this.timers.size };
	}

	private schedule(pending: Pending, delayMs: number) {
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			void this.deliver(pending);
		}, delayMs);
		this.timers.add(timer);
	}

	private async deliver(pending: Pending) {
		if (!this.consumer) {
			this.schedule(pending, 1000);
			return;
		}
		try {
			await this.consumer(pending.body);
		} catch (error) {
			console.error(`Queue ${this.name}: job failed`, error);
			if (pending.attempts < this.maxRetries) this.schedule({ body: pending.body, attempts: pending.attempts + 1 }, 10_000);
			else console.error(`Queue ${this.name}: giving up after ${this.maxRetries} retries`, pending.body);
		}
	}

	stop() {
		for (const timer of this.timers) clearTimeout(timer);
		this.timers.clear();
	}
}

export class BullMQQueue implements MailflareQueue {
	private queue: BullQueue;
	private worker: BullWorker | null = null;
	private consumer: QueueConsumer | null = null;
	private readonly connection: Redis;
	private readonly workerConnection: Redis;
	private readonly concurrency: number;

	constructor(readonly name: string, redisUrl: string, options?: { concurrency?: number }) {
		this.concurrency = options?.concurrency ?? 10;
		const connOpts = {
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
			retryStrategy(times: number) {
				return Math.min(times * 1000, 10_000);
			},
		};

		this.connection = new Redis(redisUrl, connOpts);
		this.workerConnection = new Redis(redisUrl, connOpts);

		this.connection.on("error", (err) => {
			console.warn(`BullMQ Queue [${this.name}] Redis connection warning:`, err?.message || err);
		});
		this.workerConnection.on("error", (err) => {
			console.warn(`BullMQ Worker [${this.name}] Redis connection warning:`, err?.message || err);
		});

		this.queue = new BullQueue(name, {
			connection: this.connection as unknown as ConnectionOptions,
		});
	}

	setConsumer(consumer: QueueConsumer) {
		this.consumer = consumer;
		if (this.worker) {
			void this.worker.close();
		}

		this.worker = new BullWorker(
			this.name,
			async (job) => {
				await consumer(job.data);
			},
			{
				connection: this.workerConnection as unknown as ConnectionOptions,
				concurrency: this.concurrency,
			},
		);

		this.worker.on("failed", (job, err) => {
			console.error(`Queue ${this.name}: job ${job?.id} failed`, err);
		});
	}

	async send(body: unknown, options?: { delaySeconds?: number }) {
		await this.queue.add("job", body, {
			delay: (options?.delaySeconds ?? 0) * 1000,
			attempts: 4,
			backoff: {
				type: "exponential",
				delay: 10_000,
			},
			removeOnComplete: 2000,
			removeOnFail: 5000,
		});
	}

	async sendBatch(messages: Iterable<{ body: unknown; delaySeconds?: number }>) {
		const jobs = Array.from(messages).map((message) => ({
			name: "job",
			data: message.body,
			opts: {
				delay: (message.delaySeconds ?? 0) * 1000,
				attempts: 4,
				backoff: {
					type: "exponential" as const,
					delay: 10_000,
				},
				removeOnComplete: 2000,
				removeOnFail: 5000,
			},
		}));

		if (jobs.length > 0) {
			await this.queue.addBulk(jobs);
		}
	}

	async metrics() {
		try {
			const count = await this.queue.count();
			return { backlogCount: count };
		} catch {
			return { backlogCount: 0 };
		}
	}

	async stop() {
		try {
			if (this.worker) await this.worker.close();
			await this.queue.close();
			this.connection.disconnect();
			this.workerConnection.disconnect();
		} catch (err) {
			console.error(`Error stopping BullMQ queue ${this.name}:`, err);
		}
	}
}

export function openQueue<T = unknown>(
	name: string,
	options?: { redisUrl?: string; maxRetries?: number; concurrency?: number },
): Queue<T> & MailflareQueue {
	const redisUrl = options?.redisUrl ?? process.env.REDIS_URL?.trim();
	if (redisUrl) {
		try {
			return new BullMQQueue(name, redisUrl, options) as unknown as Queue<T> & MailflareQueue;
		} catch (error) {
			console.warn(`Failed to initialize BullMQ for queue "${name}". Falling back to InProcessQueue:`, error);
		}
	}
	return new InProcessQueue(name, options) as unknown as Queue<T> & MailflareQueue;
}
