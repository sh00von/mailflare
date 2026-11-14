"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { RefreshCw, ShieldCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

type CaptchaFieldProps = {
	className?: string;
	resetSignal?: number;
	required?: boolean;
	disabled?: boolean;
};

export function CaptchaField({
	className,
	resetSignal = 0,
	required = true,
	disabled = false,
}: CaptchaFieldProps) {
	const [svg, setSvg] = useState<string>("");
	const [token, setToken] = useState<string>("");
	const [answer, setAnswer] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [refreshing, setRefreshing] = useState<boolean>(false);
	const id = useId();

	const loadCaptcha = useCallback(async () => {
		try {
			setRefreshing(true);
			const res = await fetch("/api/auth/captcha", { credentials: "same-origin" });
			if (res.ok) {
				const data = (await res.json()) as { svg: string; token: string };
				setSvg(data.svg);
				setToken(data.token);
				setAnswer("");
			}
		} catch (err) {
			console.error("Failed to load captcha", err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void loadCaptcha();
	}, [loadCaptcha, resetSignal]);

	return (
		<div className={cn("space-y-1.5", className)}>
			<div className="flex items-center justify-between text-xs">
				<label htmlFor={`captcha-input-${id}`} className="flex items-center gap-1.5 font-medium text-neutral-700">
					<ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
					<span>Type the characters you see</span>
				</label>
				<button
					type="button"
					onClick={() => void loadCaptcha()}
					disabled={loading || refreshing || disabled}
					className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
					title="Get a new verification code"
				>
					<RefreshCw className={cn("h-3 w-3", (refreshing || loading) && "animate-spin")} />
					<span>New image</span>
				</button>
			</div>

			<div className="flex items-center gap-2">
				{/* Captcha SVG Preview */}
				<div
					className="relative flex h-10 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
					aria-label="Characters to type"
				>
					{loading ? (
						<div className="flex items-center gap-1.5 text-xs text-neutral-400">
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							<span>Loading...</span>
						</div>
					) : (
						<div
							className="flex h-full w-full items-center justify-center select-none"
							dangerouslySetInnerHTML={{ __html: svg }}
						/>
					)}
				</div>

				{/* User input */}
				<input
					id={`captcha-input-${id}`}
					type="text"
					name="captchaAnswer"
					value={answer}
					onChange={(e) => setAnswer(e.target.value.toUpperCase())}
					placeholder="Characters"
					required={required}
					disabled={disabled || loading}
					maxLength={5}
					autoComplete="off"
					autoCorrect="off"
					spellCheck="false"
					className="flex h-10 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-mono uppercase tracking-widest text-neutral-900 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-neutral-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100"
				/>

				{/* Hidden token field for form submission */}
				<input type="hidden" name="captchaToken" value={token} />
			</div>
		</div>
	);
}

