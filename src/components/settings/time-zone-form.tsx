"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUserTimeZonePreference } from "@/lib/time/client";
import { formatCurrentTimeInZone, listTimeZones, updateUserTimeZone } from "./time-zone-form-utils";
import type { TimeZoneFormProps } from "./time-zone-form-types";

export function TimeZoneForm({ userId, initialTimeZone }: TimeZoneFormProps) {
	const [timeZone, setTimeZone] = useState(initialTimeZone ?? "");
	const [savedTimeZone, setSavedTimeZone] = useState(initialTimeZone ?? "");
	const [saving, setSaving] = useState(false);
	const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	const currentZone = timeZone.trim() || deviceTimeZone;
	const validZone = (() => {
		try { return formatCurrentTimeInZone(currentZone); }
		catch { return null; }
	})();

	return <form className="space-y-4 rounded-lg bg-white p-6" onSubmit={(event) => {
		event.preventDefault();
		setSaving(true);
		void updateUserTimeZone(timeZone).then((saved) => {
			setTimeZone(saved ?? "");
			setSavedTimeZone(saved ?? "");
			saveUserTimeZonePreference(userId, saved);
			notify.success("Time zone saved");
		}).catch((error) => notify.error(error, "Could not save time zone")).finally(() => setSaving(false));
	}}>
		<div>
			<h3 className="text-lg font-semibold text-neutral-900">Time zone</h3>
			<p className="mt-1 text-sm text-neutral-500">{`Choose the time zone used for dates, search, and scheduling. Leave blank to follow this device (${deviceTimeZone}).`}</p>
		</div>
		<div className="space-y-2">
			<Label htmlFor="account-time-zone">Time zone</Label>
			<Input id="account-time-zone" list="account-time-zone-options" value={timeZone} onChange={(event) => { setTimeZone(event.target.value); }} placeholder={`Device time zone (${deviceTimeZone})`} autoComplete="off" />
			<datalist id="account-time-zone-options">{listTimeZones(deviceTimeZone).map((zone) => <option key={zone} value={zone} />)}</datalist>
			{validZone && <p className="text-sm text-neutral-500">{`Current time: ${validZone}`}</p>}
		</div>
		<div className="flex items-center gap-3">
			<Button type="submit" disabled={saving || timeZone.trim() === savedTimeZone || !validZone}>{saving ? "Saving..." : "Save time zone"}</Button>
		</div>
	</form>;
}
