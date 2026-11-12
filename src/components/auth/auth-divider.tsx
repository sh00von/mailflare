/** A thin rule with a short label in the middle, used between sign-in methods. */
export function AuthDivider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-4 text-sm text-neutral-500" role="separator" aria-label={label}>
			<span className="h-px flex-1 bg-neutral-200" />
			<span>{label}</span>
			<span className="h-px flex-1 bg-neutral-200" />
		</div>
	);
}
