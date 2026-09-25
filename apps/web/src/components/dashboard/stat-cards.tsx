"use client";

import { Card, CardContent } from "@contractor-os/ui/components/card";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import { useEffect, useRef, useState } from "react";
import { isTerminal, isThisMonth, type Lead } from "./types";

function useCountUp(target: number, durationMs = 600): number {
	const [value, setValue] = useState(0);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min((now - start) / durationMs, 1);
			const eased = 1 - (1 - progress) ** 3;
			setValue(Math.round(target * eased));
			if (progress < 1) {
				rafRef.current = requestAnimationFrame(tick);
			}
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [target, durationMs]);

	return value;
}

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: number;
	hint: string;
}) {
	const display = useCountUp(value);
	return (
		<Card>
			<CardContent className="p-6">
				<div
					className="font-semibold text-3xl tabular-nums tracking-tight"
					aria-live="polite"
				>
					{display}
				</div>
				<div className="mt-1 font-medium text-sm">{label}</div>
				<div className="mt-0.5 text-muted-foreground text-xs">{hint}</div>
			</CardContent>
		</Card>
	);
}

export function StatCards({ leads }: { leads: Lead[] | undefined }) {
	if (leads === undefined) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<Skeleton className="h-9 w-16" />
							<Skeleton className="mt-2 h-4 w-24" />
							<Skeleton className="mt-1 h-3 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	const activeLeads = leads.filter((l) => !isTerminal(l.state)).length;
	const siteVisits = leads.filter(
		(l) => l.state === "Site Visit Scheduled",
	).length;
	const proposalsOut = leads.filter(
		(l) => l.state === "Proposal Sent" || l.state === "Bid Submitted",
	).length;
	const wonThisMonth = leads.filter(
		(l) => l.state === "Won" && isThisMonth(l.updatedAt),
	).length;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<StatCard
				label="Active leads"
				value={activeLeads}
				hint="Across all open stages"
			/>
			<StatCard
				label="Site visits scheduled"
				value={siteVisits}
				hint="Visits on the books"
			/>
			<StatCard
				label="Proposals out"
				value={proposalsOut}
				hint="Sent or bid submitted"
			/>
			<StatCard
				label="Won this month"
				value={wonThisMonth}
				hint="Closed jobs"
			/>
		</div>
	);
}
