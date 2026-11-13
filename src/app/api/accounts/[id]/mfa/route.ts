import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireTeamAdmin } from "../../utils";
import { canManageUserAccount, isPrimaryAdmin } from "@/lib/auth/admin";
import { selectAccountById } from "../utils";
import { disableMfa } from "@/lib/auth/mfa";
import { createAuditLog } from "@/lib/mailboxes/audit";
import { authError } from "@/lib/http/auth-error";
import { isSameWorkspace } from "@/lib/plans/usage";
import type { AccountRouteParams } from "../types";

/**
 * Emergency admin action to reset 2FA / TOTP for an account
 * in case a team member loses their authenticator phone/device.
 */
export async function DELETE(request: Request, { params }: AccountRouteParams) {
	const access = await requireTeamAdmin(request);
	if (access.error) return access.error;
	const { id } = await params;
	const account = await selectAccountById(getDb(access.env), id);
	if (!account) return authError("invalid_request", 404);
	const actor = access.user!;
	if (!isSameWorkspace(actor, account)) return authError("invalid_request", 404);
	if (!isPrimaryAdmin(actor) && !canManageUserAccount(actor, account)) {
		return authError("verification_failed", 403);
	}

	await disableMfa(access.env, id);
	await createAuditLog(access.env, {
		actorUserId: actor.id,
		targetUserId: id,
		action: "auth.admin_mfa_reset",
	});

	return NextResponse.json({ ok: true, message: "Two-factor authentication has been reset for this account." });
}

