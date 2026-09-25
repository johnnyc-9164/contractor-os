"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import { CalendarClock, History, Hourglass } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
	type HistoryEvent,
	isTerminal,
	type Lead,
	leadName,
	relativeDate,
} from "./types";

const STALE_MS = 3 * 86_400_000;

function StagePill({ stage }: { stage: string }) {
	return (
		<span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground">
			{stage}
		</span>
	);
}

function LeadRow({ lead }: { lead: Lead }) {
	return (
		<Link
			href={`/leads/${encodeURIComponent(lead.identifier)}` as Route}
			className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0 hover:bg-muted/50"
		>
			<div className="min-w-0">
				<div className="truncate font-medium text-sm">{leadName(lead)}</div>
				<div className="mt-0.5 text-muted-foreground text-xs">
					{relativeDate(lead.updatedAt)}
				</div>
			</div>
			<StagePill stage={lead.state} />
		</Link>
	);
}

function BriefingSection({
	icon: Icon,
	title,
	emptyText,
	children,
	count,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	emptyText: string;
	children: React.ReactNode;
	count: number;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon className="h-4 w-4" />
					{title}
					<span className="font-normal text-muted-foreground text-xs">
						({count})
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{count === 0 ? (
					<p className="py-2 text-muted-foreground text-sm">{emptyText}</p>
				) : (
					children
				)}
			</CardContent>
		</Card>
	);
}

export function MorningBriefing({
	leads,
	history,
}: {
	leads: Lead[] | undefined;
	history: HistoryEvent[] | undefined;
}) {
	if (leads === undefined) {
		return (
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{[0, 1, 2].map((i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-12 w-full" />
							<Skeleton className="mt-2 h-12 w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	const byIdentifier = new Map(leads.map((l) => [l.identifier, l]));

	const siteVisits = leads
		.filter((l) => l.state === "Site Visit Scheduled")
		.sort((a, b) => b.updatedAt - a.updatedAt);

	const staleLeads = leads
		.filter((l) => !isTerminal(l.state) && Date.now() - l.updatedAt >= STALE_MS)
		.sort((a, b) => a.updatedAt - b.updatedAt);

	const recentChanges = (history ?? [])
		.filter((e) => byIdentifier.has(e.identifier))
		.sort((a, b) => b.occurredAt - a.occurredAt)
		.slice(0, 8);

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<BriefingSection
				icon={CalendarClock}
				title="Site visits scheduled"
				emptyText="No site visits on the books."
				count={siteVisits.length}
			>
				{siteVisits.map((lead) => (
					<LeadRow key={lead.id} lead={lead} />
				))}
			</BriefingSection>

			<BriefingSection
				icon={Hourglass}
				title="Stale leads"
				emptyText="Nothing stale. Every open lead has activity in the last 3 days."
				count={staleLeads.length}
			>
				{staleLeads.map((lead) => (
					<LeadRow key={lead.id} lead={lead} />
				))}
			</BriefingSection>

			<BriefingSection
				icon={History}
				title="Latest changes"
				emptyText="No recent activity."
				count={recentChanges.length}
			>
				{recentChanges.map((event) => {
					const lead = byIdentifier.get(event.identifier);
					if (!lead) return null;
					return <LeadRow key={event.id} lead={lead} />;
				})}
			</BriefingSection>
		</div>
	);
}
