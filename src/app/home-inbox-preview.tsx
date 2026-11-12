import { Menu, Pencil, Search, Star } from "@/components/icons";
import { heroMessages, sidebarItems } from "./utils";

const AVATAR_TONES = ["bg-blue-600", "bg-green-700", "bg-amber-700", "bg-purple-600"];

/** Decorative inbox mock for the landing page hero. Fixed light colours so it never follows dark mode. */
export function HomeInboxPreview() {
	return (
		<div aria-hidden="true" className="overflow-hidden rounded-[20px] border border-neutral-300 bg-white text-left shadow-lg">
			<div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
				<Menu className="h-5 w-5 text-neutral-500" />
				<span className="hidden text-sm font-medium text-neutral-500 sm:inline">Mail</span>
				<div className="ml-2 flex h-10 flex-1 items-center gap-3 rounded-full bg-neutral-100 px-4 text-sm text-neutral-500">
					<Search className="h-4 w-4" />
					<span className="truncate">Search mail</span>
				</div>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">A</span>
			</div>
			<div className="flex">
				<div className="hidden w-48 shrink-0 flex-col gap-1 p-3 md:flex">
					<span className="mb-2 inline-flex w-fit items-center gap-2.5 rounded-2xl bg-blue-100 px-4 py-3 text-sm font-medium text-blue-900">
						<Pencil className="h-4 w-4" />
						Compose
					</span>
					{sidebarItems.map((item) => (
						<span
							key={item.labelKey}
							className={`flex items-center gap-3 rounded-full px-3 py-1.5 text-[13px] ${item.active ? "bg-blue-100 font-semibold text-blue-900" : "text-neutral-700"}`}
						>
							<item.icon className="h-4 w-4" />
							<span className="flex-1">{item.labelKey}</span>
							{item.count && <span className="text-xs">{item.count}</span>}
						</span>
					))}
				</div>
				<ul className="min-w-0 flex-1 divide-y divide-neutral-100 md:rounded-tl-2xl md:border-l md:border-t md:border-neutral-200">
					{heroMessages.map((message, index) => (
						<li key={message.subjectKey} className="flex items-center gap-3 px-4 py-3">
							<Star className={`hidden h-4 w-4 shrink-0 sm:block ${index === 0 ? "fill-amber-500 text-amber-500" : "text-neutral-300"}`} />
							<span
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
							>
								{message.sender.charAt(0)}
							</span>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className={`truncate text-[13px] ${index < 2 ? "font-semibold text-neutral-900" : "text-neutral-700"}`}>{message.sender}</span>
									<span className="ml-auto shrink-0 text-[11px] text-neutral-500">{["9:41 AM", "9:12 AM", "Yesterday", "Mon"][index]}</span>
								</div>
								<p className="truncate text-[13px] text-neutral-700">
									<span className={index < 2 ? "font-semibold text-neutral-900" : ""}>{message.subjectKey}</span>
									<span className="text-neutral-500"> — {message.previewKey}</span>
								</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
