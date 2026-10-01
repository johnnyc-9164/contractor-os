"use client";

import { Button } from "@contractor-os/ui/components/button";

export function WorkspaceFeedback({
	title,
	children,
	isLoading = false,
}: {
	title: string;
	children?: React.ReactNode;
	isLoading?: boolean;
}) {
	return (
		<main className="grid place-items-center p-8 text-center">
			<div className="max-w-lg space-y-4">
				<h1 className="font-semibold text-2xl">{title}</h1>
				{isLoading ? <p role="status">Please wait.</p> : children}
			</div>
		</main>
	);
}

export function WorkspaceError({ retry }: { retry?: () => void }) {
	return (
		<WorkspaceFeedback title="Workspace could not load">
			<p>
				The workspace request failed. Try again. If this continues, ask your
				administrator to check your workspace access.
			</p>
			<Button
				type="button"
				className="min-h-11"
				onClick={retry ?? (() => window.location.reload())}
			>
				{retry ? "Try again" : "Reload page"}
			</Button>
		</WorkspaceFeedback>
	);
}
