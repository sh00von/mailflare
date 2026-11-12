"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AUTH_INPUT_CLASS } from "./auth-ui-utils";

/** Password field with a show/hide toggle, styled for the auth pages. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
	({ className, ...props }, ref) => {
		const [visible, setVisible] = useState(false);
		return (
			<div className="relative">
				<Input ref={ref} type={visible ? "text" : "password"} className={cn(AUTH_INPUT_CLASS, "pr-12", className)} {...props} />
				<button
					type="button"
					onClick={() => setVisible((value) => !value)}
					className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
					aria-label={visible ? "Hide password" : "Show password"}
					aria-pressed={visible}
				>
					{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
				</button>
			</div>
		);
	},
);
PasswordInput.displayName = "PasswordInput";
