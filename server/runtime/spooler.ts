import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";

export const MEMORY_SPOOL_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB

export interface SpoolResult {
	buffer: Buffer;
	size: number;
	spooledToDisk: boolean;
	filePath?: string;
	cleanup: () => Promise<void>;
}

/**
 * Hybrid stream spooler:
 * - Payloads <= 2MB stay entirely in memory for high performance.
 * - Payloads > 2MB automatically spill to a temporary file on disk, preventing Node.js OOM crashes.
 */
export async function spoolIncomingStream(stream: Readable): Promise<SpoolResult> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let totalBytes = 0;
		let spooledToDisk = false;
		let tempFilePath: string | undefined;
		let diskWriteStream: ReturnType<typeof createWriteStream> | undefined;

		const spoolDir = join(process.cwd(), "data", "spool");
		const targetDir = existsSync(join(process.cwd(), "data")) ? spoolDir : tmpdir();

		try {
			mkdirSync(targetDir, { recursive: true });
		} catch {
			// Ignore if exists
		}

		stream.on("data", (chunk: Buffer) => {
			totalBytes += chunk.length;

			if (!spooledToDisk) {
				chunks.push(chunk);
				if (totalBytes > MEMORY_SPOOL_THRESHOLD_BYTES) {
					// Spill to disk
					spooledToDisk = true;
					tempFilePath = join(targetDir, `spool_${Date.now()}_${Math.random().toString(36).slice(2)}.mime`);
					try {
						diskWriteStream = createWriteStream(tempFilePath);
						for (const c of chunks) {
							diskWriteStream.write(c);
						}
						chunks.length = 0; // Clear memory
					} catch (err) {
						reject(err);
					}
				}
			} else if (diskWriteStream) {
				diskWriteStream.write(chunk);
			}
		});

		stream.on("end", () => {
			if (spooledToDisk && diskWriteStream && tempFilePath) {
				diskWriteStream.end(() => {
					try {
						const fileBuffer = readFileSync(tempFilePath!);
						resolve({
							buffer: fileBuffer,
							size: totalBytes,
							spooledToDisk: true,
							filePath: tempFilePath,
							cleanup: async () => {
								try {
									if (tempFilePath && existsSync(tempFilePath)) {
										rmSync(tempFilePath, { force: true });
									}
								} catch {
									// Ignore cleanup errors
								}
							},
						});
					} catch (readErr) {
						reject(readErr);
					}
				});
			} else {
				const finalBuffer = Buffer.concat(chunks);
				resolve({
					buffer: finalBuffer,
					size: totalBytes,
					spooledToDisk: false,
					cleanup: async () => {},
				});
			}
		});

		stream.on("error", (err) => {
			if (diskWriteStream) {
				diskWriteStream.destroy();
			}
			if (tempFilePath && existsSync(tempFilePath)) {
				try {
					rmSync(tempFilePath, { force: true });
				} catch {}
			}
			reject(err);
		});
	});
}
