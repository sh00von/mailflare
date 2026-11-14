"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSessionInfo, type SessionInfo } from "@/hooks/use-current-user";
import { ArrowRight, Clock, Sparkles } from "@/components/icons";

export function TrialStatusBanner() {
	const [workspace, setWorkspace] = useState<SessionInfo["workspace"]>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		fetchSessionInfo().then((session) => {
			if (session?.workspace) {
				setWorkspace(session.workspace);
			}
		});
	}, []);

	if (!workspace || workspace.status !== "trialing") {
		return null;
	}

	const isExpired = workspace.trialExpired || workspace.daysLeftInTrial === 0;
	const daysLeft = workspace.daysLeftInTrial ?? 0;

	if (dismissed && !isExpired) {
		return null;
	}

	if (isExpired) {
		return (
			<aside aria-label="Subscription status" className="w-full bg-neutral-900 text-white px-4 py-2 text-xs shadow-xs transition-all">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
						<span className="font-semibold text-white">
							14-Day Pro Trial ended:
						</span>
						<span className="text-neutral-300">
							Your account is active on the Free Plan (1 mailbox). Upgrade to restore full team capacity.
						</span>
					</div>
					<Link
						href="/admin/plan"
						className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-blue-500 transition-colors shrink-0"
					>
						<span>Upgrade from $1.99/mo</span>
						<ArrowRight className="h-3 w-3" />
					</Link>
				</div>
			</aside>
		);
	}

	return (
		<aside aria-label="Trial status" className="w-full bg-blue-50/90 border-b border-blue-100 px-4 py-1.5 text-xs text-blue-900 transition-all">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
						<Clock className="h-3 w-3" />
					</span>
					<span>
						<strong className="font-semibold">14-Day Free Pro Trial:</strong>{" "}
						{daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
					</span>
					<span className="hidden md:inline text-neutral-500">
						(All 5 mailboxes &amp; team features unlocked)
					</span>
				</div>
				<div className="flex items-center gap-3">
					<Link
						href="/admin/plan"
						className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline"
					>
						<span>Explore Plans (from $1.99/mo)</span>
						<ArrowRight className="h-3 w-3" />
					</Link>
					<button
						type="button"
						onClick={() => setDismissed(true)}
						className="text-blue-400 hover:text-blue-600 text-xs px-1 cursor-pointer"
						aria-label="Dismiss banner"
					>
						×
					</button>
				</div>
			</div>
		</aside>
	);
}
