"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LeadDrawer } from "../../../components/leads/lead-drawer";
import { LeadWorkspacePresentation } from "../../../components/paint-os/presentations";
import { displayStage, nextStage, stageGroup } from "./lead-stages";

type Lead = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	revision: number;
	updatedAt: number;
};

type HistoryEvent = {
	id: string;
	identifier: string;
	actorId: string;
	occurredAt: number;
};

function relativeDate(timestamp: number): string {
	const elapsed = Date.now() - timestamp;
	const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		["year", 31_536_000_000],
		["month", 2_592_000_000],
		["day", 86_400_000],
		["hour", 3_600_000],
		["minute", 60_000],
	];
	for (const [unit, milliseconds] of units) {
		if (Math.abs(elapsed) >= milliseconds) {
			return formatter.format(-Math.round(elapsed / milliseconds), unit);
		}
	}
	return "just now";
}

function LeadList() {
	const [cursor, setCursor] = useState<string | null>(null);
	const [loadedLeads, setLoadedLeads] = useState<Lead[]>([]);
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const result = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 20, cursor },
	});
	const history = useQuery(api.backend.history, {
		paginationOpts: { numItems: 50, cursor: null },
	});

	useEffect(() => {
		if (!result) return;
		setLoadedLeads((current) => {
			const byId = new Map(current.map((lead) => [lead.id, lead]));
			for (const lead of result.page as Lead[]) byId.set(lead.id, lead);
			return [...byId.values()];
		});
	}, [result]);

	// Derive the selected lead from the reactive query result so the drawer
	// always shows fresh data — actions refresh it with no manual reload
	// and no selection clearing.
	const selectedLead = selectedLeadId
		? (loadedLeads.find((lead) => lead.identifier === selectedLeadId) ?? null)
		: null;

	const actorsByLead = useMemo(() => {
		const actors = new Map<string, HistoryEvent>();
		for (const event of (history?.page ?? []) as HistoryEvent[]) {
			const previous = actors.get(event.identifier);
			if (!previous || event.occurredAt > previous.occurredAt) {
				actors.set(event.identifier, event);
			}
		}
		return actors;
	}, [history]);

	const metrics = useMemo(() => {
		const counts = { active: 0, "on-hold": 0, terminal: 0 };
		for (const lead of loadedLeads) counts[stageGroup(lead.state)] += 1;
		return counts;
	}, [loadedLeads]);

	const openDrawerFor = (lead: Lead) => {
		setSelectedLeadId(lead.identifier);
		setDrawerOpen(true);
	};

	if (result === undefined && loadedLeads.length === 0) {
		return (
			<p className="py-16 text-center text-muted-foreground text-sm">
				Loading leads…
			</p>
		);
	}

	return (
		<>
			<div className="grid grid-cols-3 divide-x divide-border border-border border-y bg-muted/30">
				{[
					["Active", metrics.active],
					["On hold", metrics["on-hold"]],
					["Terminal", metrics.terminal],
				].map(([label, count]) => (
					<div className="px-4 py-4 sm:px-6" key={label}>
						<div className="font-semibold text-2xl tabular-nums">{count}</div>
						<div className="text-muted-foreground text-sm">{label}</div>
					</div>
				))}
			</div>

			{loadedLeads.length === 0 ? (
				<div className="px-6 py-20 text-center">
					<h2 className="font-medium text-base">No leads</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						New leads will appear here.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[820px] border-collapse text-left text-sm">
						<thead>
							<tr className="border-border border-b text-muted-foreground">
								<th className="px-6 py-3 font-medium">Lead</th>
								<th className="px-4 py-3 font-medium">Stage</th>
								<th className="px-4 py-3 font-medium">Next</th>
								<th className="px-4 py-3 font-medium">Last handled by</th>
								<th className="px-6 py-3 text-right font-medium">Updated</th>
							</tr>
						</thead>
						<tbody>
							{loadedLeads.map((lead) => {
								const next = nextStage(lead.state);
								return (
									<tr
										className="cursor-pointer border-border border-b transition-colors hover:bg-muted/50"
										key={lead.id}
										onClick={() => openDrawerFor(lead)}
									>
										<td className="px-6 py-4">
											<button
												className="cursor-pointer text-left font-medium underline-offset-4 hover:underline"
												onClick={(event) => {
													event.stopPropagation();
													openDrawerFor(lead);
												}}
												type="button"
											>
												{lead.title || lead.identifier}
											</button>
											<div className="mt-1 font-mono text-muted-foreground text-xs">
												{lead.identifier}
											</div>
											<Link
												href={`/leads/${encodeURIComponent(lead.identifier)}`}
												aria-label={`Open details for ${lead.title || lead.identifier}`}
												className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
												onClick={(event) => event.stopPropagation()}
											>
												Open details
											</Link>
										</td>
										<td className="px-4 py-4">
											<span className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs">
												{displayStage(lead.state)}
											</span>
										</td>
										<td className="px-4 py-4 text-muted-foreground">
											{next ? `Next: ${next}` : "—"}
										</td>
										<td className="max-w-48 truncate px-4 py-4 text-muted-foreground">
											{actorsByLead.get(lead.identifier)?.actorId ?? "—"}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right text-muted-foreground">
											<time dateTime={new Date(lead.updatedAt).toISOString()}>
												{relativeDate(lead.updatedAt)}
											</time>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{result && !result.isDone ? (
				<div className="flex justify-center p-6">
					<Button
						className="rounded-lg"
						disabled={result === undefined}
						onClick={() => setCursor(result.continueCursor)}
						variant="outline"
					>
						Load more
					</Button>
				</div>
			) : null}

			<LeadDrawer
				lead={selectedLead}
				onOpenChange={setDrawerOpen}
				open={drawerOpen}
			/>
		</>
	);
}

export default function LeadsPage() {
	return (
		<>
			<Authenticated>
				<LeadWorkspacePresentation
					title="Leads"
					description="See where every lead stands and what comes next."
					actions={<UserButton />}
				>
					<section className="paint-os-live-card paint-os-lead-list">
						<LeadList />
					</section>
				</LeadWorkspacePresentation>
			</Authenticated>
			<Unauthenticated>
				<main className="mx-auto max-w-lg px-6 py-24 text-center">
					<h1 className="font-semibold text-2xl">Sign in to view leads</h1>
					<p className="mt-2 mb-6 text-muted-foreground text-sm">
						Your lead pipeline is available after you sign in.
					</p>
					<SignInButton>
						<Button className="rounded-lg">Sign in</Button>
					</SignInButton>
				</main>
			</Unauthenticated>
			<AuthLoading>
				<p className="py-24 text-center text-muted-foreground text-sm">
					Loading…
				</p>
			</AuthLoading>
		</>
	);
}
