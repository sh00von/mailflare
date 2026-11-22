import { getDb } from "@/db";
import { requireSessionUser } from "@/lib/api/auth";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { clearSuppressionEntry, listSuppressedAddresses } from "@/lib/email/suppression";

export async function GET(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	if (!isPrimaryAdmin(auth.user)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const db = getDb(env);
	const entries = await listSuppressedAddresses(db);

	return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	if (!isPrimaryAdmin(auth.user)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}
	if (!hasValidSessionMutationOrigin(request)) {
		return Response.json({ error: "Invalid origin" }, { status: 403 });
	}

	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) {
		return Response.json({ error: "Missing suppression ID" }, { status: 400 });
	}

	const db = getDb(env);
	await clearSuppressionEntry(db, id);

	return Response.json({ success: true });
}
