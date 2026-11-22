"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Search, X } from "@/components/icons";
import { Input } from "@/components/ui/input";
import type { HeaderSearchProps } from "./header-search-types";

// The header search shared by every layout. On phones it is an icon beside the menu button
// until tapped, then covers the header at full width; the wrapper still fills the row so
// whatever follows it stays pushed to the right.
export function HeaderSearch({ value, onChange, label, placeholder, onSubmit, trailing, inputProps, mobileEnd }: HeaderSearchProps) {
	const [expanded, setExpanded] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (expanded) inputRef.current?.focus();
	}, [expanded]);

	return (
		<div className={clsx("flex min-w-0 flex-1 items-center", mobileEnd && !expanded && "max-md:justify-end")}>
			<button
				type="button"
				onClick={() => setExpanded(true)}
				aria-label={label}
				className={clsx("flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full hover:bg-neutral-200 md:hidden", value ? "bg-blue-100 text-blue-700" : "text-neutral-600", expanded && "hidden")}
			>
				<Search className="h-5 w-5" aria-hidden="true" />
			</button>
			<form
				role="search"
				onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
						setExpanded(false);
					}
				}}
				className={clsx("h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-search px-4 text-neutral-600 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow md:flex", expanded ? "flex max-md:fixed max-md:inset-x-2 max-md:top-[max(0.5rem,env(safe-area-inset-top))] max-md:z-[60] max-md:shadow-md" : "max-md:hidden")}
			>
				<Search className="h-5 w-5 shrink-0" aria-hidden="true" />
				<Input
					ref={inputRef}
					{...inputProps}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					aria-label={label}
					placeholder={placeholder ?? label}
					className="h-full min-w-0 flex-1 bg-transparent text-base md:text-[15px] text-neutral-800 outline-none! shadow-none! border-none! placeholder:text-neutral-500"
				/>
				{value && (
					<button
						type="button"
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => {
							onChange("");
							inputRef.current?.focus();
						}}
						aria-label="Clear search"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200/80 hover:text-neutral-800 transition-colors cursor-pointer"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</button>
				)}
				{trailing}
			</form>
		</div>
	);
}
