import { CheckCircle2, Inbox, Mail, Search, Send } from "@/components/icons";
import { heroMessages, sidebarItems } from "./utils";

const avatarTones = ["bg-blue-100 text-blue-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800"];

/** A static, decorative rendering of the inbox for the landing hero. */
export function HomeInboxPreview() {
	return (
		<div className="relative" aria-hidden="true">
			<div className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-16 -z-10 rounded-[3rem] bg-blue-100/60 blur-3xl" />

			<div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(11,87,208,0.45)] ring-1 ring-black/[0.02]">
				<div className="flex h-10 items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4">
					<span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
					<span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
					<span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
				</div>

				<div className="grid min-h-[420px] grid-cols-1 sm:grid-cols-[168px_1fr]">
					<aside className="hidden flex-col gap-1 border-r border-neutral-100 bg-neutral-50 px-3 py-4 sm:flex">
						<div className="mb-3 flex h-11 w-fit items-center gap-2 rounded-2xl bg-blue-100 px-4 text-sm font-semibold text-blue-950">
							<Mail className="h-4 w-4" />
							Compose
						</div>
						{sidebarItems.map((item) => {
							const Icon = item.icon;
							return (
								<div
									key={item.labelKey}
									className={`flex h-8 items-center justify-between rounded-full px-3 text-[13px] font-medium ${
										item.active ? "bg-blue-100 text-blue-950" : "text-neutral-600"
									}`}
								>
									<span className="flex items-center gap-2.5">
										<Icon className="h-4 w-4" />
										{item.labelKey}
									</span>
									{item.count && <span className="text-xs">{item.count}</span>}
								</div>
							);
						})}
					</aside>

					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-3 px-4 py-3">
							<div className="flex h-10 flex-1 items-center gap-3 rounded-full bg-neutral-100 px-4 text-sm text-neutral-500">
								<Search className="h-4 w-4" />
								Search mail
							</div>
						</div>
						<div className="flex items-center justify-between border-b border-neutral-100 px-5 pb-3">
							<div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
								<Inbox className="h-4 w-4 text-blue-600" />
								Inbox
							</div>
							<span className="text-xs text-neutral-500">Synced just now</span>
						</div>
						<ul className="divide-y divide-neutral-100">
							{heroMessages.map((message, index) => (
								<li key={message.sender} className={`flex items-center gap-3 px-5 py-3 ${index === 0 ? "bg-blue-50/50" : ""}`}>
									<span
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTones[index % avatarTones.length]}`}
									>
										{message.sender.charAt(0)}
									</span>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-2">
											<span className={`truncate text-sm ${index === 0 ? "font-semibold text-neutral-950" : "font-medium text-neutral-800"}`}>
												{message.sender}
											</span>
											<span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
												{message.badgeKey}
											</span>
										</div>
										<p className="truncate text-[13px] text-neutral-500">
											<span className="font-medium text-neutral-800">{message.subjectKey}</span>
											{" · "}
											{message.previewKey}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			<div className="absolute -left-6 bottom-16 hidden w-64 items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-lg shadow-neutral-900/5 lg:flex">
				<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
				<div>
					<p className="text-sm font-semibold text-neutral-900">SPF, DKIM and DMARC verified</p>
					<p className="mt-0.5 text-xs text-neutral-500">yourcompany.com is ready to send</p>
				</div>
			</div>

			<div className="absolute -right-4 -top-5 hidden items-center gap-3 rounded-xl bg-neutral-900 py-2.5 pl-3.5 pr-2.5 text-sm text-white shadow-lg md:flex">
				<Send className="h-4 w-4" />
				Message sent
				<span className="rounded-md px-2 py-1 font-semibold text-blue-300">Undo</span>
			</div>
		</div>
	);
}
