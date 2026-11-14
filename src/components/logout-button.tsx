"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutClientSession } from "@/lib/auth/logout";
import { notify } from "@/lib/notify";

export function LogoutButton() {
	const router = useRouter();
	return (
		<Button
			variant="outline"
			className="w-full"
			onClick={async () => {
				const switched = await logoutClientSession();
				if (switched) notify.success("Signed out");
				router.replace(switched ? "/inbox" : "/login");
				router.refresh();
			}}
		>
			Log out
		</Button>
	);
}
