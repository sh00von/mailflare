import { saveManagedAccount } from "../utils";
import type { PasswordSaveOptions } from "./types";

export async function saveAccountPassword({ account, password, stepUpToken, setPassword, setSaving, setMessage }: PasswordSaveOptions) {
	if (!account) return;
	setSaving(true);
	setMessage(null);
	try {
		await saveManagedAccount({ ...account, newPassword: password }, stepUpToken);
		setPassword("");
		setMessage("Password reset. This account has been signed out everywhere.");
	} catch (error) {
		setMessage(error instanceof Error ? error.message : "Unable to reset password");
		throw error;
	} finally {
		setSaving(false);
	}
}
