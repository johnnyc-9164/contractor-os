"use client";

import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import { TriangleAlert } from "lucide-react";

export default function DashboardError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-12 sm:px-6">
			<Card className="w-full">
				<CardHeader>
					<TriangleAlert
						className="size-5 text-destructive"
						aria-hidden="true"
					/>
					<CardTitle>Dashboard data did not load</CardTitle>
					<CardDescription>
						Check your connection and try again. If this continues, confirm your
						business membership is enabled.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={reset} type="button">
						Try again
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
