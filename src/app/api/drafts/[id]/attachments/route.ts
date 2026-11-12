import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { MAX_ATTACHMENT_COUNT, listMessageAttachments, storeMessageAttachments } from "@/lib/email/attachments";
import { getOutboundAttachmentMaxMb } from "@/lib/email/attachment-policy";
import { checkCanAddAttachment } from "@/lib/plans/usage";
import { readFormDataBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { userOwnsDraft } from "../../utils";
import type { DraftAttachmentUploadParams } from "./types";

export async function POST(request: Request, { params }: DraftAttachmentUploadParams) {
	const { id } = await params;
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (!hasValidSessionMutationOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
	const db = getDb(env);
	const [draft] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
	if (!userOwnsDraft(draft, user.id)) return Response.json({ error: "Draft not found" }, { status: 404 });
	let form: FormData;
	try { form = await readFormDataBody(request, 30 * 1024 * 1024); }
	catch (error) { return Response.json({ error: "Invalid attachment request" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
	const files = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
	if (!files.length) return Response.json({ error: "No attachments provided" }, { status: 400 });
	const existing = await listMessageAttachments(env, id);
	const existingBytes = existing.reduce((total, file) => total + file.size, 0);
	const newBytes = files.reduce((total, file) => total + file.size, 0);
	const quota = await checkCanAddAttachment(env, user, newBytes, existingBytes + newBytes);
	if (!quota.ok) return Response.json({ error: quota.error }, { status: 403 });
	const maxBytes = (await getOutboundAttachmentMaxMb(env)) * 1_000_000;
	if (existing.length + files.length > MAX_ATTACHMENT_COUNT || files.some((file) => file.size > maxBytes) || existingBytes + newBytes > maxBytes) return Response.json({ error: "Draft attachments exceed the allowed count or outgoing size limit" }, { status: 400 });
	try {
		const attachments = await storeMessageAttachments(env, id, await Promise.all(files.map(async (file) => ({ filename: file.name, type: file.type || "application/octet-stream", content: await file.arrayBuffer(), disposition: "attachment" as const }))));
		return Response.json({ attachments });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : "Could not add attachments" }, { status: 400 });
	}
}
