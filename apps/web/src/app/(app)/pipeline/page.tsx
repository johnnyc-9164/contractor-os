// TC-APP-01: Pipeline board route.

"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LeadWorkspacePresentation } from "../../../components/paint-os/presentations";
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
				<LeadWorkspacePresentation
					title="Leads Pipeline"
					description="The painting lead lifecycle, from prospect to signed job."
				>
					<PipelineBoard />
				</LeadWorkspacePresentation>
			</Authenticated>
		</>
	);
}
