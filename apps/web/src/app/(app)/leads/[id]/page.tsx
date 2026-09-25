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
import { useParams, useSearchParams } from "next/navigation";
import { displayStage } from "../lead-stages";

type ProjectionValue = unknown;
type ProjectionEntry = { value?: unknown } & Record<string, unknown>;
type HistoryEvent = {
	id: string;
	identifier: string;
	type: "record.created" | "record.updated";
	actorId: string;
	occurredAt: number;
	command: string | null;
};

function displayValue(value: ProjectionValue): string {
	if (value === null || value === undefined || value === "") return "—";
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	)
		return String(value);
	return JSON.stringify(value);
}

function ProjectionList({ data }: { data: Record<string, ProjectionValue> }) {
	const entries = Object.entries(data);
	if (entries.length === 0)
		return <p className="text-muted-foreground text-sm">No data recorded.</p>;
	return (
		<dl className="divide-y divide-border">
			{entries.map(([label, value]) => (
				<div
					className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6"
					key={label}
				>
					<dt className="text-muted-foreground text-sm">{label}</dt>
					<dd className="break-words text-sm">{displayValue(value)}</dd>
				</div>
			))}
		</dl>
	);
}

function Detail() {
	const params = useParams<{ id: string }>();
	const searchParams = useSearchParams();
	const identifier = decodeURIComponent(params.id);
	const record = useQuery(api.backend.inspectRecord, {
		blueprint: "co_lead",
		identifier,
	});
	const history = useQuery(api.backend.history, {
		paginationOpts: { numItems: 50, cursor: null },
	});

	if (record === undefined)
		return (
			<p className="py-24 text-center text-muted-foreground text-sm">
				Loading lead…
			</p>
		);
	if (record === null)
		return (
			<div className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
				<h1 className="font-semibold text-xl">Lead not found</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					This lead is not available in your account.
				</p>
				<Link
					className="mt-6 inline-block font-medium text-sm underline underline-offset-4"
					href="/leads"
				>
					Back to leads
				</Link>
			</div>
		);

	const mirrorState = (record.mirrors.state as ProjectionEntry | undefined)
		?.value;
	// The record's own mirror is authoritative; the ?state= query param is only
	// the list's snapshot at link time.
	const rawStage =
		typeof mirrorState === "string"
			? mirrorState
			: (searchParams.get("state") ?? null);
	const events = ((history?.page ?? []) as HistoryEvent[])
		.filter((event) => event.identifier === identifier)
		.toSorted((a, b) => b.occurredAt - a.occurredAt);

	return (
		<>
			<header className="mb-6 flex items-start justify-between gap-4">
				<div>
					<Link
						className="text-muted-foreground text-sm underline-offset-4 hover:underline"
						href="/leads"
					>
						Leads
					</Link>
					<div className="mt-3 flex flex-wrap items-center gap-3">
						<h1 className="font-semibold text-2xl tracking-tight">
							{record.title || record.identifier}
						</h1>
						<span className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs">
							{rawStage ? displayStage(rawStage) : "Unknown"}
						</span>
					</div>
					<p className="mt-1 font-mono text-muted-foreground text-xs">
						{record.identifier}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Link href={`/quotes/new?lead_id=${encodeURIComponent(identifier)}`}>
						<Button>New quote</Button>
					</Link>
					<UserButton />
				</div>
			</header>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
				<div className="space-y-6">
					<section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
						<h2 className="mb-4 font-semibold text-base">Record facts</h2>
						<dl className="grid gap-4 sm:grid-cols-3">
							<div>
								<dt className="text-muted-foreground text-xs">Identifier</dt>
								<dd className="mt-1 break-all font-mono text-sm">
									{record.identifier}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Revision</dt>
								<dd className="mt-1 text-sm tabular-nums">{record.revision}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Evaluated</dt>
								<dd className="mt-1 text-sm">
									<time dateTime={new Date(record.evaluatedAt).toISOString()}>
										{new Intl.DateTimeFormat("en", {
											dateStyle: "medium",
											timeStyle: "short",
										}).format(record.evaluatedAt)}
									</time>
								</dd>
							</div>
						</dl>
					</section>
					{record.warnings.length > 0 ? (
						<section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
							<h2 className="font-semibold text-base text-destructive">
								Warnings
							</h2>
							<ul className="mt-3 space-y-2 text-sm">
								{record.warnings.map((warning: unknown, index: number) => (
									<li key={`${index}-${displayValue(warning)}`}>
										{displayValue(warning)}
									</li>
								))}
							</ul>
						</section>
					) : null}
					{[
						["Calculations", record.calculations],
						["Mirrors", record.mirrors],
						["Aggregates", record.aggregates],
					].map(([heading, data]) => (
						<section
							className="rounded-2xl border border-border bg-card p-6 shadow-sm"
							key={heading as string}
						>
							<h2 className="mb-2 font-semibold text-base">
								{heading as string}
							</h2>
							<ProjectionList data={data as Record<string, ProjectionValue>} />
						</section>
					))}
					<section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
						<h2 className="mb-4 font-semibold text-base">Scorecards</h2>
						{record.scorecards.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No scorecards recorded.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{record.scorecards.map((scorecard: unknown, index: number) => (
									<li
										className="py-3 text-sm"
										key={`${index}-${displayValue(scorecard)}`}
									>
										{displayValue(scorecard)}
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
				<aside className="self-start rounded-2xl border border-border bg-card p-6 shadow-sm">
					<h2 className="font-semibold text-base">Activity</h2>
					{history === undefined ? (
						<p className="mt-4 text-muted-foreground text-sm">
							Loading activity…
						</p>
					) : events.length === 0 ? (
						<p className="mt-4 text-muted-foreground text-sm">
							No activity found in recent history.
						</p>
					) : (
						<ol className="mt-4 divide-y divide-border">
							{events.map((event) => (
								<li className="py-4 first:pt-0" key={event.id}>
									<p className="font-medium text-sm">
										{event.type === "record.created"
											? "Lead created"
											: "Lead updated"}
									</p>
									<dl className="mt-2 space-y-1 text-muted-foreground text-xs">
										<div>
											<dt className="inline">Actor: </dt>
											<dd className="inline break-all">{event.actorId}</dd>
										</div>
										<div>
											<dt className="inline">Time: </dt>
											<dd className="inline">
												<time
													dateTime={new Date(event.occurredAt).toISOString()}
												>
													{new Intl.DateTimeFormat("en", {
														dateStyle: "medium",
														timeStyle: "short",
													}).format(event.occurredAt)}
												</time>
											</dd>
										</div>
										<div>
											<dt className="inline">Command: </dt>
											<dd className="inline">{event.command ?? "—"}</dd>
										</div>
									</dl>
								</li>
							))}
						</ol>
					)}
				</aside>
			</div>
		</>
	);
}

export default function LeadDetailPage() {
	return (
		<>
			<Authenticated>
				<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Detail />
				</main>
			</Authenticated>
			<Unauthenticated>
				<main className="mx-auto max-w-lg px-6 py-24 text-center">
					<h1 className="font-semibold text-2xl">Sign in to view this lead</h1>
					<p className="mt-2 mb-6 text-muted-foreground text-sm">
						Lead details are available after you sign in.
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
