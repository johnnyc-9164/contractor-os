"use client";

import { Button } from "@contractor-os/ui/components/button";
import { useEffect } from "react";

export default function CustomersError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="mx-auto max-w-lg px-6 py-24 text-center">
			<h1 className="font-semibold text-2xl">Customers could not be loaded</h1>
			<p className="mt-2 mb-6 text-muted-foreground text-sm">
				Check your connection and try loading the live customer worklist again.
			</p>
			<Button onClick={reset}>Try again</Button>
		</main>
	);
}
