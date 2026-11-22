import { Check, CornerDownLeft, Inbox, MailCheck, Menu, Pencil, Search, Sparkles, Star } from "@/components/icons";
import { heroMessages, sidebarItems } from "./utils";

const AVATAR_TONES = [
	"bg-blue-600 text-white",
	"bg-emerald-600 text-white",
	"bg-amber-600 text-white",
	"bg-purple-600 text-white",
];

/** Decorative inbox mock for the landing page hero. Fixed light colours so it never follows dark mode. */
export function HomeInboxPreview() {
	return (
		<div
			aria-hidden="true"
			className="overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-200/80 bg-white text-left shadow-2xl shadow-neutral-900/10 ring-1 ring-neutral-900/5 transition duration-300 hover:shadow-neutral-900/15"
		>
			{/* Window Chrome / Top Bar */}
			<div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80 px-4 py-3 sm:px-5">
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-red-400/90 shadow-2xs" />
					<span className="h-3 w-3 rounded-full bg-amber-400/90 shadow-2xs" />
					<span className="h-3 w-3 rounded-full bg-emerald-400/90 shadow-2xs" />
					<span className="ml-3 hidden text-[11px] font-semibold tracking-wider text-neutral-400 uppercase sm:inline">
						Replyot Workspace · Fast Inbox
					</span>
				</div>

				<div className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white px-3.5 py-1 text-xs text-neutral-600 shadow-2xs">
					<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
					<span className="font-mono text-[11px]">app.replyot.com/mail/inbox</span>
				</div>

				<div className="hidden items-center gap-1.5 text-xs text-neutral-400 sm:flex">
					<span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-600">⌘K</span>
					<span className="text-[11px]">Command menu</span>
				</div>
			</div>

			{/* Sub-header / Search bar */}
			<div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 sm:px-6">
				<Menu className="h-4 w-4 text-neutral-400" />
				<div className="flex h-9 flex-1 items-center gap-2.5 rounded-xl bg-neutral-100/80 px-3 text-xs text-neutral-500">
					<Search className="h-3.5 w-3.5 text-neutral-400" />
					<span className="truncate">Search messages, teammates, or labels…</span>
					<span className="ml-auto hidden rounded border border-neutral-300/80 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 sm:inline">/</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 sm:inline-flex items-center gap-1">
						<Check className="h-3 w-3" /> support@acme.io
					</span>
					<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-2xs">
						A
					</span>
				</div>
			</div>

			<div className="flex">
				{/* Sidebar */}
				<div className="hidden w-48 shrink-0 flex-col gap-1 p-3.5 md:flex bg-neutral-50/40 border-r border-neutral-100">
					<button
						type="button"
						className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
					>
						<Pencil className="h-3.5 w-3.5" />
						Compose Message
					</button>
					{sidebarItems.map((item) => (
						<div
							key={item.labelKey}
							className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
								item.active
									? "bg-blue-50 font-bold text-blue-800"
									: "text-neutral-600 hover:bg-neutral-100"
							}`}
						>
							<item.icon className="h-3.5 w-3.5 shrink-0" />
							<span className="flex-1">{item.labelKey}</span>
							{item.count ? (
								<span className="rounded-full bg-neutral-200/80 px-1.5 py-0.2 font-mono text-[10px] font-medium text-neutral-700">
									{item.count}
								</span>
							) : null}
						</div>
					))}

					<div className="mt-6 pt-4 border-t border-neutral-200/60">
						<span className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
							Speed Hotkeys
						</span>
						<div className="mt-2 space-y-1.5 px-2 text-[11px] text-neutral-500">
							<div className="flex items-center justify-between">
								<span>Next message</span>
								<kbd className="rounded bg-neutral-200/60 px-1 py-0.5 font-mono text-[10px]">J</kbd>
							</div>
							<div className="flex items-center justify-between">
								<span>Prev message</span>
								<kbd className="rounded bg-neutral-200/60 px-1 py-0.5 font-mono text-[10px]">K</kbd>
							</div>
							<div className="flex items-center justify-between">
								<span>Archive thread</span>
								<kbd className="rounded bg-neutral-200/60 px-1 py-0.5 font-mono text-[10px]">E</kbd>
							</div>
						</div>
					</div>
				</div>

				{/* Message list */}
				<ul className="min-w-0 flex-1 divide-y divide-neutral-100 bg-white">
					{heroMessages.map((message, index) => (
						<li
							key={message.subjectKey}
							className={`flex items-center gap-3 px-4 py-3 sm:px-5 transition hover:bg-neutral-50/80 ${
								index === 0 ? "bg-blue-50/25" : ""
							}`}
						>
							<Star
								className={`hidden h-4 w-4 shrink-0 sm:block ${
									index === 0
										? "fill-amber-400 text-amber-400"
										: "text-neutral-200 hover:text-neutral-400"
								}`}
							/>
							<span
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs ${
									AVATAR_TONES[index % AVATAR_TONES.length]
								}`}
							>
								{message.sender.charAt(0)}
							</span>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span
										className={`truncate text-xs ${
											index < 2
												? "font-bold text-neutral-900"
												: "font-medium text-neutral-700"
										}`}
									>
										{message.sender}
									</span>
									<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
										{message.badgeKey}
									</span>
									<span className="ml-auto shrink-0 font-mono text-[11px] text-neutral-400">
										{["9:41 AM", "9:12 AM", "Yesterday", "Mon"][index]}
									</span>
								</div>
								<p className="truncate text-xs text-neutral-600 mt-0.5">
									<span className={index < 2 ? "font-semibold text-neutral-900" : ""}>
										{message.subjectKey}
									</span>
									<span className="text-neutral-400"> — {message.previewKey}</span>
								</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
