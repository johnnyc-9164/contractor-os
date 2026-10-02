// TC-APP-01: Authenticated Painter OS lead work surface.

"use client";

import { SignInButton } from "@clerk/nextjs";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { PipelineBoard } from "../../../components/pipeline/pipeline-board";

export default function PipelinePage() {
	return (
		<>
			<AuthLoading>
				<main className="px-4 py-6 sm:px-6" role="status" aria-live="polite">
					<span className="sr-only">Loading lead workspace</span>
					<div className="mb-6 flex flex-col gap-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-full max-w-xl" />
					</div>
					<Skeleton className="h-80 w-full" />
				</main>
			</AuthLoading>

			<Unauthenticated>
				<main className="px-6 py-20 text-center">
					<h1 className="font-medium text-lg">Leads pipeline</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Sign in to work the painting lead pipeline.
					</p>
					<div className="mt-4">
						<SignInButton />
					</div>
				</main>
			</Unauthenticated>

			<Authenticated>
				<main className="min-w-0 px-4 py-6 sm:px-6">
					<header className="mb-6 flex flex-col gap-1 border-b pb-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Sales
						</p>
						<h1 className="font-semibold text-2xl tracking-tight">
							Leads pipeline
						</h1>
						<p className="max-w-2xl text-muted-foreground text-sm">
							Find the next lead that needs attention, inspect its live record,
							and move it through the approved painting sales workflow.
						</p>
					</header>
					<PipelineBoard />
				</main>
			</Authenticated>
		</>
	);
}
