"use client";

import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";

export default function JobsError({ reset }: { reset: () => void }) {
	return (
		<main className="overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
			<Card className="mx-auto w-full max-w-lg" role="alert">
				<CardHeader>
					<CardTitle>Jobs could not be loaded</CardTitle>
					<CardDescription>
						The jobs service did not return a worklist. Try the request again.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						No job data was changed.
					</p>
				</CardContent>
				<CardFooter>
					<Button onClick={reset}>Try again</Button>
				</CardFooter>
			</Card>
		</main>
	);
}
