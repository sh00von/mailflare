import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { RouteLoadingBar } from "@/components/route-loading-bar";

export function PageSkeleton() {
	return <RouteLoadingBar />;
}

export function ListPageSkeleton() {
	return (
		<div className="h-full min-h-0">
			<div className="flex h-14 items-center justify-between border-b border-neutral-200 px-6">
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-4 w-24" />
			</div>
			<SkeletonRows count={8} />
		</div>
	);
}

/** `withToolbar={false}` when the caller already renders the real toolbar above it. */
export function MessageDetailSkeleton({ withToolbar = true }: { withToolbar?: boolean } = {}) {
	return (
		<div role="status" aria-label="Loading message" className="h-full space-y-6 p-6">
			{withToolbar && (
				<div className="flex justify-between">
					<Skeleton className="h-9 w-9 rounded-full" />
					<Skeleton className="h-9 w-48" />
				</div>
			)}
			<Skeleton className="h-8 w-3/5" />
			<div className="flex items-start gap-3 border-b border-neutral-100 pb-5">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-3 w-32" />
				</div>
				<Skeleton className="h-3 w-28" />
			</div>
			<div className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-11/12" />
				<Skeleton className="h-4 w-4/5" />
				<Skeleton className="h-4 w-5/6" />
			</div>
		</div>
	);
}

export function TableSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
			<Skeleton className="h-10 w-full rounded-none" />
			<SkeletonRows count={6} />
		</div>
	);
}

export function CardGridSkeleton() {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			{Array.from({ length: 4 }, (_, index) => (
				<div
					key={index}
					className="flex min-h-24 items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4"
				>
					<Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-2/5" />
						<Skeleton className="h-3.5 w-4/5" />
						<Skeleton className="h-3 w-1/3" />
					</div>
				</div>
			))}
		</div>
	);
}

export function SectionRowSkeleton() {
	return (
		<div className="flex min-h-20 items-center gap-4 rounded-3xl bg-white px-5 py-4">
			<Skeleton className="h-10 w-10 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-4 w-2/5 max-w-48" />
				<Skeleton className="h-3.5 w-3/5 max-w-80" />
			</div>
		</div>
	);
}

const MESSAGE_ROW_WIDTHS = [
	["w-28", "w-3/5", "w-2/5"],
	["w-36", "w-1/2", "w-1/3"],
	["w-24", "w-2/3", "w-1/4"],
	["w-32", "w-2/5", "w-1/2"],
	["w-28", "w-3/4", "w-1/5"],
	["w-20", "w-1/2", "w-2/5"],
];

/** Placeholder rows shaped like the mail list: checkbox, star, sender, subject and snippet, date. */
export function MessageListSkeleton({ count = 10, compact = false }: { count?: number; compact?: boolean }) {
	return (
		<div role="status" aria-label="Loading messages" className="divide-y divide-neutral-100">
			{Array.from({ length: count }, (_, index) => {
				const [sender, subject, snippet] = MESSAGE_ROW_WIDTHS[index % MESSAGE_ROW_WIDTHS.length];
				return compact ? (
					<div key={index} className="flex items-start gap-3 px-4 py-3">
						<Skeleton className="h-10 w-10 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 space-y-2 pt-0.5">
							<div className="flex items-center justify-between gap-3">
								<Skeleton className={`h-3.5 ${sender}`} />
								<Skeleton className="h-3 w-10" />
							</div>
							<Skeleton className={`h-3.5 ${subject}`} />
							<Skeleton className={`h-3 ${snippet}`} />
						</div>
					</div>
				) : (
					<div key={index} className="grid min-h-12 grid-cols-[24px_32px_minmax(160px,200px)_1fr_auto] items-center gap-3 px-6">
						<Skeleton className="h-4 w-4 rounded" />
						<Skeleton className="h-4 w-4 rounded-full" />
						<Skeleton className={`h-3.5 ${sender}`} />
						<div className="flex min-w-0 items-center gap-2">
							<Skeleton className={`h-3.5 ${subject}`} />
							<Skeleton className={`h-3 ${snippet} max-md:hidden`} />
						</div>
						<Skeleton className="h-3 w-12" />
					</div>
				);
			})}
			<span className="sr-only">Loading messages</span>
		</div>
	);
}

type FormSkeletonField = string | { label: string; tall?: boolean };

/**
 * Placeholder for a form while its values load. Pass the real field labels so they stay
 * visible; only the inputs shimmer. Without labels it shows `rows` unlabelled fields.
 */
export function FormSkeleton({ fields, rows = 3 }: { fields?: FormSkeletonField[]; rows?: number }) {
	const items: FormSkeletonField[] = fields ?? Array.from({ length: rows }, () => "");
	return (
		<div role="status" aria-label="Loading" className="space-y-4">
			{items.map((field, index) => {
				const label = typeof field === "string" ? field : field.label;
				const tall = typeof field === "object" && field.tall;
				return (
					<div key={index} className="space-y-2">
						{label ? <p className="text-sm font-medium leading-none text-neutral-900">{label}</p> : <Skeleton className="h-3.5 w-28" />}
						{/* The field frame is static UI; only the value inside it shimmers. */}
						{tall ? (
							<div className="min-h-36 w-full space-y-2.5 rounded-md border border-neutral-200 px-3 py-3 shadow-sm shadow-neutral-200/50">
								<Skeleton className="h-3 w-2/5" />
								<Skeleton className="h-3 w-1/3" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						) : (
							<div className="flex h-10 w-full items-center rounded-md border border-neutral-200 px-3 shadow-sm shadow-neutral-200/50">
								<Skeleton className="h-3 w-2/5 max-w-48" />
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
