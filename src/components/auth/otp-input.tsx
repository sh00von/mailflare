"use client";

import { useEffect, useRef, useState } from "react";

interface OtpInputProps {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	disabled?: boolean;
	autoFocus?: boolean;
	className?: string;
}

export function OtpInput({
	value,
	onChange,
	length = 6,
	disabled = false,
	autoFocus = true,
	className = "",
}: OtpInputProps) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

	// Split the string value into individual character cells
	const digits = Array.from({ length }, (_, i) => value[i] || "");

	useEffect(() => {
		if (autoFocus && inputRefs.current[0]) {
			inputRefs.current[0].focus();
		}
	}, [autoFocus]);

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
		if (e.key === "Backspace") {
			if (!digits[index] && index > 0) {
				// Current box is empty: jump back to previous box and clear it
				e.preventDefault();
				const newDigits = [...digits];
				newDigits[index - 1] = "";
				onChange(newDigits.join(""));
				inputRefs.current[index - 1]?.focus();
			} else if (digits[index]) {
				// Clear current box
				e.preventDefault();
				const newDigits = [...digits];
				newDigits[index] = "";
				onChange(newDigits.join(""));
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			e.preventDefault();
			inputRefs.current[index - 1]?.focus();
		} else if (e.key === "ArrowRight" && index < length - 1) {
			e.preventDefault();
			inputRefs.current[index + 1]?.focus();
		}
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
		const rawVal = e.target.value.replace(/\D/g, "");
		if (!rawVal) {
			const newDigits = [...digits];
			newDigits[index] = "";
			onChange(newDigits.join(""));
			return;
		}

		if (rawVal.length > 1) {
			// User typed or pasted multiple digits
			handlePastedValue(rawVal, index);
			return;
		}

		// Single digit entered
		const char = rawVal[rawVal.length - 1];
		const newDigits = [...digits];
		newDigits[index] = char;
		onChange(newDigits.join(""));

		// Advance focus to next input
		if (index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	}

	function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "");
		if (!pastedData) return;
		handlePastedValue(pastedData, startIndex);
	}

	function handlePastedValue(pasted: string, startIndex: number) {
		const newDigits = [...digits];
		let nextFocus = startIndex;

		for (let i = 0; i < pasted.length && startIndex + i < length; i++) {
			newDigits[startIndex + i] = pasted[i];
			nextFocus = startIndex + i;
		}

		onChange(newDigits.join(""));

		// Focus the next empty box or the last filled box
		const targetFocus = Math.min(nextFocus + 1, length - 1);
		inputRefs.current[targetFocus]?.focus();
	}

	return (
		<div className={`flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-full ${className}`}>
			{digits.map((digit, i) => {
				const isFocused = focusedIdx === i;
				const isFilled = !!digit;

				return (
					<input
						key={i}
						ref={(el) => {
							inputRefs.current[i] = el;
						}}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						maxLength={1}
						value={digit}
						disabled={disabled}
						autoComplete={i === 0 ? "one-time-code" : "off"}
						onFocus={(e) => {
							setFocusedIdx(i);
							e.target.select();
						}}
						onBlur={() => setFocusedIdx(null)}
						onKeyDown={(e) => handleKeyDown(e, i)}
						onChange={(e) => handleChange(e, i)}
						onPaste={(e) => handlePaste(e, i)}
						className={`h-12 w-10 sm:h-14 sm:w-12 min-w-0 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none select-none ${
							isFocused
								? "border-blue-600 bg-white ring-4 ring-blue-500/15 shadow-sm text-blue-600"
								: isFilled
								? "border-neutral-300 bg-neutral-50/70 text-neutral-900 shadow-xs"
								: "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 shadow-2xs"
						} disabled:cursor-not-allowed disabled:opacity-50`}
						aria-label={`Digit ${i + 1} of ${length}`}
					/>
				);
			})}
		</div>
	);
}
