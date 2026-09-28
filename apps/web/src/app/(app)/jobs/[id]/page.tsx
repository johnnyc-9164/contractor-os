"use client";

import { SignInButton } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button, buttonVariants } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	formatJobDate,
	formatJobMoney,
	jobDetailState,
	recordedProgress,
} from "./job-detail";

function Detail() {
	const { id: identifier } = useParams<{ id: string }>();
	const record = useQuery(api.backend.inspectRecord, {
		blueprint: "co_job",
		identifier,
	});
	const details = useQuery(api.jobDetails.get, { identifier });
	const financials = useQuery(
		api.backend.jobFinancials,
		record ? { identifier } : "skip",
	);
	const state = jobDetailState(record, financials);

	if (state === "loading" || details === undefined) {
		return (
			<p className="py-24 text-center text-muted-foreground">Loading job…</p>
		);
	}
	if (state === "missing" || details === null) {
		return (
			<Card className="mx-auto max-w-lg">
				<CardHeader>
					<CardTitle>Job unavailable</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground text-sm">
						This job was not found in your company’s records.
					</p>
					<Link className={buttonVariants({ variant: "outline" })} href="/jobs">
						Back to jobs
					</Link>
				</CardContent>
			</Card>
		);
	}
	if (!record) return null;

	const status = details.status;
	const progress = recordedProgress(details.percentComplete);
	const location = [
		details.address,
		[details.city, details.state].filter(Boolean).join(", "),
	]
		.filter(Boolean)
		.join(" · ");
	const amounts =
		financials?.identifier === record.identifier ? financials : null;

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Link
					className="text-muted-foreground text-sm underline-offset-4 hover:underline"
					href="/jobs"
				>
					Jobs
				</Link>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
							{details.title?.trim() ||
								record.title?.trim() ||
								record.identifier}
						</h1>
						<p className="mt-1 break-all font-mono text-muted-foreground text-xs">
							{record.identifier}
						</p>
						{location ? (
							<p className="mt-2 text-muted-foreground text-sm">{location}</p>
						) : null}
					</div>
					{status ? (
						<span className="rounded-full border border-border bg-secondary px-3 py-1 text-secondary-foreground text-sm">
							{status.replace(/[_-]+/g, " ")}
						</span>
					) : null}
				</div>
			</header>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
				<section aria-labelledby="financial-heading" className="space-y-4">
					{progress !== null ? (
						<Card>
							<CardHeader>
								<CardTitle>Recorded progress</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<progress
									aria-label="Recorded job progress"
									className="w-full accent-primary"
									max={100}
									value={progress}
								/>
								<p className="text-muted-foreground text-sm tabular-nums">
									{progress}% complete
								</p>
							</CardContent>
						</Card>
					) : null}
					<h2 className="font-semibold text-lg" id="financial-heading">
						Financial overview
					</h2>
					{state === "loading-financials" ? (
						<p aria-busy="true" className="text-muted-foreground text-sm">
							Loading financials…
						</p>
					) : amounts ? (
						<div className="grid gap-4 sm:grid-cols-3">
							{(
								[
									["Contract", amounts.contractAmount],
									["Billed to date", amounts.billedToDate],
									["Outstanding invoices", amounts.outstandingBalance],
								] as const
							).map(([label, amount]) => (
								<Card key={label}>
									<CardHeader>
										<CardTitle className="text-muted-foreground text-sm">
											{label}
										</CardTitle>
									</CardHeader>
									<CardContent className="font-semibold text-xl tabular-nums">
										{formatJobMoney(amount, amounts.currency)}
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<Card>
							<CardContent className="py-6 text-muted-foreground text-sm">
								No financial summary is available for this job.
							</CardContent>
						</Card>
					)}
				</section>

				<aside>
					<Card>
						<CardHeader>
							<CardTitle>Job record</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="space-y-4 text-sm">
								<div>
									<dt className="text-muted-foreground">Status</dt>
									<dd className="mt-1 font-medium">
										{status ? status.replace(/[_-]+/g, " ") : "Not recorded"}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Record revision</dt>
									<dd className="mt-1 tabular-nums">{record.revision}</dd>
								</div>
								{details.jobType ? (
									<div>
										<dt className="text-muted-foreground">Job type</dt>
										<dd className="mt-1 capitalize">
											{details.jobType.replace(/_/g, " ")}
										</dd>
									</div>
								) : null}
								{formatJobDate(details.startDate) ? (
									<div>
										<dt className="text-muted-foreground">Start date</dt>
										<dd className="mt-1">{formatJobDate(details.startDate)}</dd>
									</div>
								) : null}
								{formatJobDate(details.projectedEndDate) ? (
									<div>
										<dt className="text-muted-foreground">Projected end</dt>
										<dd className="mt-1">
											{formatJobDate(details.projectedEndDate)}
										</dd>
									</div>
								) : null}
							</dl>
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}

export default function JobDetailPage() {
	return (
		<>
			<AuthLoading>
				<main className="px-4 py-24 text-center text-muted-foreground">
					Loading job…
				</main>
			</AuthLoading>
			<Unauthenticated>
				<main className="mx-auto max-w-lg px-6 py-24 text-center">
					<h1 className="font-semibold text-2xl">Sign in to view this job</h1>
					<p className="mt-2 mb-6 text-muted-foreground text-sm">
						Your company’s job details are available after sign-in.
					</p>
					<SignInButton>
						<Button>Sign in</Button>
					</SignInButton>
				</main>
			</Unauthenticated>
			<Authenticated>
				<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Detail />
				</main>
			</Authenticated>
		</>
	);
}
