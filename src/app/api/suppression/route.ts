import { getDb } from "@/db";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { clearSuppressionEntry, listSuppressedAddresses } from "@/lib/email/suppression";

export async function GET(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;

	const db = getDb(env);
	const entries = await listSuppressedAddresses(db);

	return Response.json({ entries });
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;

	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) {
		return Response.json({ error: "Missing suppression ID" }, { status: 400 });
	}

	const db = getDb(env);
	await clearSuppressionEntry(db, id);

	return Response.json({ success: true });
}
