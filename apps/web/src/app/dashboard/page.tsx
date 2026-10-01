"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Badge } from "@contractor-os/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@contractor-os/ui/components/table";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import Link from "next/link";
import { CreateInvoiceForm } from "../../components/CreateInvoiceForm";
import { CreateJobForm } from "../../components/CreateJobForm";
import { CreateLeadForm } from "../../components/CreateLeadForm";
import { DashboardPresentation } from "../../components/paint-os/presentations";
import { displayStage } from "../(app)/leads/lead-stages";

const updatedFormatter = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

function LeadUpdatedAt({ timestamp }: { timestamp: number }) {
	if (!Number.isFinite(timestamp)) return <>Not available</>;
	const date = new Date(timestamp);
	if (!Number.isFinite(date.getTime())) return <>Not available</>;
	return (
		<time dateTime={date.toISOString()}>
			{updatedFormatter.format(date)} UTC
		</time>
	);
}

function leadStageLabel(state: string): string {
	const label = displayStage(state);
	return typeof label === "string" ? label : state;
}

function LeadsList() {
	const leads = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 20, cursor: null },
	});

	return (
		<Table aria-label="Recent leads" className="min-w-xl table-fixed text-base">
			<TableHeader>
				<TableRow className="border-border/50 bg-background text-xs uppercase tracking-wider hover:bg-background">
					<TableHead
						scope="col"
						className="w-2/5 p-4 font-semibold text-muted-foreground"
					>
						Lead
					</TableHead>
					<TableHead
						scope="col"
						className="w-1/5 p-4 font-semibold text-muted-foreground"
					>
						Stage
					</TableHead>
					<TableHead
						scope="col"
						className="w-1/4 p-4 font-semibold text-muted-foreground"
					>
						Updated
					</TableHead>
					<TableHead
						scope="col"
						className="p-4 text-right font-semibold text-muted-foreground"
					>
						Action
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{leads === undefined || leads.page.length === 0 ? (
					<TableRow className="hover:bg-transparent">
						<TableCell colSpan={4} className="p-6 text-muted-foreground">
							<p role="status">
								{leads === undefined
									? "Loading leads..."
									: "No leads yet. Create a lead below to get started."}
							</p>
						</TableCell>
					</TableRow>
				) : (
					leads.page.map(
						(lead: {
							id: string;
							identifier: string;
							title: string | null;
							state: string;
							updatedAt: number;
						}) => (
							<TableRow key={lead.id} className="border-border/30">
								<TableCell className="whitespace-normal break-words p-4">
									<Link
										href={`/leads/${encodeURIComponent(lead.identifier)}`}
										className="wrap-anywhere inline-flex min-h-11 max-w-full items-center font-medium underline underline-offset-4"
									>
										{lead.title || lead.identifier}
									</Link>
									{lead.title ? (
										<div className="font-mono text-muted-foreground text-xs">
											{lead.identifier}
										</div>
									) : null}
								</TableCell>
								<TableCell className="whitespace-normal p-4">
									<Badge
										variant="secondary"
										className="wrap-anywhere max-w-full whitespace-normal rounded-full px-2.5 py-0.5 text-left"
									>
										{leadStageLabel(lead.state)}
									</Badge>
								</TableCell>
								<TableCell className="whitespace-normal p-4 text-muted-foreground text-sm">
									<LeadUpdatedAt timestamp={lead.updatedAt} />
								</TableCell>
								<TableCell className="whitespace-normal p-4 text-right">
									<Link
										href={`/leads/${encodeURIComponent(lead.identifier)}`}
										aria-label={`Open details for ${lead.title || lead.identifier}`}
										className="inline-flex min-h-11 items-center text-primary text-sm underline underline-offset-4"
									>
										Open details
									</Link>
								</TableCell>
							</TableRow>
						),
					)
				)}
			</TableBody>
		</Table>
	);
}

function JobsList() {
	const jobs = useQuery(api.backend.listJobs, {
		paginationOpts: { numItems: 20, cursor: null },
	});

	if (jobs === undefined) return <div>Loading jobs...</div>;
	if (jobs.page.length === 0) return <div>No jobs yet.</div>;

	return (
		<div className="paint-os-live-list">
			<h2>Jobs ({jobs.page.length})</h2>
			<ul>
				{jobs.page.map(
					(job: {
						id: string;
						identifier: string;
						title: string | null;
						state: string;
					}) => (
						<li key={job.id}>
							<strong>{job.title || job.identifier}</strong> — {job.state}
						</li>
					),
				)}
			</ul>
		</div>
	);
}

export default function Dashboard() {
	const user = useUser();

	return (
		<>
			<Authenticated>
				<DashboardPresentation records={<LeadsList />}>
					<header className="paint-os-workspace-heading">
						<div>
							<h2>Workspace</h2>
							<p>Welcome {user.user?.fullName}</p>
						</div>
						<UserButton />
					</header>
					<section className="paint-os-live-card">
						<JobsList />
					</section>
					<div className="paint-os-form-grid">
						<section className="paint-os-live-card">
							<CreateLeadForm />
						</section>
						<section className="paint-os-live-card">
							<CreateJobForm />
						</section>
						<section className="paint-os-live-card">
							<CreateInvoiceForm />
						</section>
					</div>
				</DashboardPresentation>
			</Authenticated>
			<Unauthenticated>
				<div style={{ padding: "2rem", textAlign: "center" }}>
					<h1>Contractor OS</h1>
					<p>Sign in to access your dashboard.</p>
					<SignInButton />
				</div>
			</Unauthenticated>
			<AuthLoading>
				<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
			</AuthLoading>
		</>
	);
}
