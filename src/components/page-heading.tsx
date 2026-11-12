"use client";


export function PageHeading({ labelKey }: { labelKey: string }) {
	return <h1 className="sr-only">{labelKey}</h1>;
}
