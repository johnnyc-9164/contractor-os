// TC-APP-01: Pipeline board route.

"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { PipelineBoard } from "../../../components/pipeline/pipeline-board";

export default function PipelinePage() {
	return (
		<>
			<AuthLoading>
				<p className="py-16 text-center text-muted-foreground text-sm">
					Loading…
				</p>
			</AuthLoading>
			<Unauthenticated>
				<div className="px-6 py-20 text-center">
					<h1 className="font-medium text-lg">Pipeline</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Sign in to view the lead pipeline.
					</p>
					<div className="mt-4">
						<SignInButton />
					</div>
				</div>
			</Unauthenticated>
			<Authenticated>
				<div className="px-4 py-6 sm:px-6">
					<h1 className="mb-1 font-semibold text-xl">Pipeline</h1>
					<p className="mb-6 text-muted-foreground text-sm">
						The painting lead lifecycle, from prospect to signed job.
					</p>
					<PipelineBoard />
				</div>
			</Authenticated>
		</>
	);
}
