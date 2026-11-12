/** Hero inbox preview image for the landing page. */
export function HomeInboxPreview() {
	return (
		<div className="overflow-hidden rounded-2xl">
			<img
				src="/hero-inbox.jpg"
				alt="Replyot workspace inbox preview"
				width={1600}
				height={1000}
				className="block h-auto w-full object-cover"
			/>
		</div>
	);
}
