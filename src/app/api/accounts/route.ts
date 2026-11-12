import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { createUserAccountSchema } from "@/lib/validators";
import { canManageUsers, isPrimaryAdmin } from "@/lib/auth/admin";
import { getWorkspaceWithUsage } from "@/lib/plans/usage";
import { deleteAccounts } from "@/lib/accounts/deletion";
import { createAccountResponse } from "./create";
import { accountListItemFromUser, listAccountsForAdmin, requireTeamAdmin } from "./utils";

export async function GET(request: Request) {
	const access = await requireTeamAdmin(request);
	if (access.error) return access.error;
	const [allRows, { workspace, usage }] = await Promise.all([
		listAccountsForAdmin(getDb(access.env)),
		getWorkspaceWithUsage(access.env, access.user!),
	]);
	const rows = isPrimaryAdmin(access.user!)
		? allRows
		: allRows.filter((row) => row.workspaceId === workspace.id || row.id === access.user!.id);
	return NextResponse.json({
		accounts: rows.map((row) => accountListItemFromUser(row)),
		seats: { limit: workspace.planDetails.maxMailboxes, used: usage.mailboxesUsed },
	});
}

export async function POST(request: Request) {
	const access = await requireTeamAdmin(request);
	if (access.error) return access.error;
	const parsed = createUserAccountSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	const actor = access.user!;
	if (!canManageUsers(actor)) {
		return NextResponse.json({ error: "You do not have permission to manage users" }, { status: 403 });
	}
	if (parsed.data.role === "admin" && !isPrimaryAdmin(actor)) {
		return NextResponse.json({ error: "Only the primary admin can create admin accounts" }, { status: 403 });
	}
	return createAccountResponse(access.env, actor, parsed.data);
}

export async function DELETE(request: Request) {
	const access = await requireTeamAdmin(request);
	if (access.error) return access.error;
	const body = (await request.json().catch(() => null)) as { ids?: unknown; transferToId?: unknown } | null;
	const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string" && !!id) : [];
	const transferToId = typeof body?.transferToId === "string" ? body.transferToId : null;
	const result = await deleteAccounts(access.env, access.user!, { ids, transferToId });
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json({ ok: true, deleted: result.deleted });
}
