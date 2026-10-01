"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { S12QuoteEditorContent } from "./screens/S12";
import { S36LeadsContent } from "./screens/S36";
import { S37DashboardContent } from "./screens/S37";

function WorkspaceNavigation() {
	return (
		<nav aria-label="Workspace views" className="flex flex-wrap gap-4">
			<Link href="/dashboard">Dashboard</Link>
			<Link href="/leads">Leads</Link>
			<Link href="/pipeline">Pipeline</Link>
		</nav>
	);
}

/** The host keeps its routes, authentication, queries and mutation components. */
export function DashboardPresentation({
	records,
	children,
}: {
	records: ReactNode;
	children: ReactNode;
}) {
	return (
		<main className="paint-os-assembly" data-paint-os-theme="">
			<div className="paint-os-page-header">
				<WorkspaceNavigation />
			</div>
			<aside className="paint-os-review-notice" aria-label="UI review notice">
				<strong>Static design examples</strong>
				<p>
					The metrics, revenue chart and AI insight below are supplied design
					examples, not your business data. Unconnected actions are disabled.
					The recent leads, jobs and creation forms use the existing app
					behavior.
				</p>
			</aside>
			<S37DashboardContent
				slots={{
					"records-table": records,
					"records-action": (
						<Link
							href="/leads"
							data-paintpro-action="s37:view-all"
							className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
						>
							View All
						</Link>
					),
				}}
			/>
			<section
				className="paint-os-existing-work"
				aria-label="Existing workspace"
			>
				{children}
			</section>
		</main>
	);
}

export function LeadWorkspacePresentation({
	title,
	description,
	children,
	actions,
}: {
	title: string;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<main className="paint-os-assembly paint-os-lead-workspace">
			<S36LeadsContent
				slots={{
					"page-header": (
						<header className="paint-os-page-header">
							<div>
								<h1>{title}</h1>
								{description ? <p>{description}</p> : null}
							</div>
							<div className="paint-os-header-actions">
								<WorkspaceNavigation />
								{actions}
							</div>
						</header>
					),
					"kanban-board": (
						<div className="paint-os-live-content">{children}</div>
					),
					"lead-details": null,
				}}
			/>
		</main>
	);
}

export function QuotePresentation({ children }: { children: ReactNode }) {
	return (
		<main className="paint-os-assembly paint-os-quote-workspace">
			<S12QuoteEditorContent
				slots={{
					"page-header": (
						<header className="paint-os-page-header">
							<div>
								<h1>Create new quote</h1>
								<p>Follow the existing lead-based quote workflow</p>
							</div>
							<Link href="/leads">Back to leads</Link>
						</header>
					),
					"content-1": <div className="paint-os-live-content">{children}</div>,
				}}
			/>
		</main>
	);
}
