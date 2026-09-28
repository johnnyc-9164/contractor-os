"use client";

import { Button, buttonVariants } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import Link from "next/link";

export default function JobDetailError({ reset }: { reset: () => void }) {
	return (
		<main className="mx-auto max-w-lg px-4 py-16">
			<Card role="alert">
				<CardHeader>
					<CardTitle>Job unavailable</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<p className="text-muted-foreground">
						This job could not be loaded. Check your access or try again.
					</p>
					<div className="flex flex-wrap gap-3">
						<Button onClick={reset}>Try again</Button>
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/jobs"
						>
							Back to jobs
						</Link>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
