"use client";

import { SignInButton } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button, buttonVariants } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@contractor-os/ui/components/empty";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	usePaginatedQuery,
} from "convex/react";
import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
	formatJobState,
	formatJobUpdatedAt,
	type JobSummary,
	jobTitle,
	uniqueJobs,
} from "./jobs-page";

const PAGE_SIZE = 18;

function JobsLoading() {
	return (
		<div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<span className="sr-only">Loading jobs…</span>
			{Array.from({ length: 6 }, (_, index) => (
				<Card aria-hidden="true" key={index}>
					<CardHeader>
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-1/3" />
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-4">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function JobCard({ job }: { job: JobSummary }) {
	const updatedAt = formatJobUpdatedAt(job.updatedAt);

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>{jobTitle(job)}</CardTitle>
				<CardDescription>
					<code>{job.identifier}</code>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<dl className="grid grid-cols-2 gap-4">
					<div className="flex min-w-0 flex-col gap-1">
						<dt className="text-muted-foreground">Status</dt>
						<dd className="font-medium">{formatJobState(job.state)}</dd>
					</div>
					<div className="flex min-w-0 flex-col gap-1">
						<dt className="text-muted-foreground">Last updated</dt>
						<dd>
							<time dateTime={new Date(job.updatedAt).toISOString()}>
								{updatedAt}
							</time>
						</dd>
					</div>
				</dl>
				<Link
					className={`${buttonVariants({ variant: "outline" })} mt-5`}
					href={`/jobs/${encodeURIComponent(job.identifier)}`}
				>
					View job
				</Link>
			</CardContent>
		</Card>
	);
}

function JobsWorklist() {
	const { results, status, loadMore } = usePaginatedQuery(
		api.backend.listJobs,
		{},
		{ initialNumItems: PAGE_SIZE },
	);
	const jobs = useMemo(() => uniqueJobs(results as JobSummary[]), [results]);

	if (status === "LoadingFirstPage") return <JobsLoading />;

	if (jobs.length === 0 && status === "Exhausted") {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<BriefcaseBusiness aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>No jobs yet</EmptyTitle>
					<EmptyDescription>
						Jobs created from awarded work will appear here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<p aria-live="polite" className="text-muted-foreground text-sm">
				{jobs.length} {jobs.length === 1 ? "job" : "jobs"} loaded
			</p>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{jobs.map((job) => (
					<JobCard job={job} key={job.id} />
				))}
			</div>

			{status === "CanLoadMore" || status === "LoadingMore" ? (
				<div className="flex justify-center">
					<Button
						disabled={status === "LoadingMore"}
						onClick={() => loadMore(PAGE_SIZE)}
						variant="outline"
					>
						{status === "LoadingMore" ? "Loading more jobs…" : "Load more jobs"}
					</Button>
				</div>
			) : (
				<p className="text-center text-muted-foreground text-sm">
					All loaded jobs are shown.
				</p>
			)}
		</div>
	);
}

export default function JobsPage() {
	return (
		<>
			<AuthLoading>
				<main className="overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
						<header>
							<h1 className="font-semibold text-2xl tracking-tight">Jobs</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								Loading your jobs…
							</p>
						</header>
						<JobsLoading />
					</div>
				</main>
			</AuthLoading>

			<Unauthenticated>
				<main className="overflow-y-auto px-6 py-24 text-center">
					<h1 className="font-semibold text-2xl">Sign in to view jobs</h1>
					<p className="mt-2 mb-6 text-muted-foreground text-sm">
						Your company’s jobs are available after you sign in.
					</p>
					<SignInButton>
						<Button>Sign in</Button>
					</SignInButton>
				</main>
			</Unauthenticated>

			<Authenticated>
				<main className="overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
						<header>
							<h1 className="font-semibold text-2xl tracking-tight">Jobs</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								Current work from your company’s live job records.
							</p>
						</header>
						<JobsWorklist />
					</div>
				</main>
			</Authenticated>
		</>
	);
}
