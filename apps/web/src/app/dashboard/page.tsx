"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button, buttonVariants } from "@contractor-os/ui/components/button";
import {
	Card,
	CardAction,
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
	useQuery,
} from "convex/react";
import {
	ArrowRight,
	BriefcaseBusiness,
	ClipboardList,
	FileText,
	type LucideIcon,
	Paintbrush,
	ReceiptText,
	UserPlus,
	UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { CreateInvoiceForm } from "../../components/CreateInvoiceForm";
import { CreateJobForm } from "../../components/CreateJobForm";
import { CreateLeadForm } from "../../components/CreateLeadForm";
import {
	type DashboardRecord,
	humanizeState,
	pageScopeLabel,
	sortRecent,
	summarizeOperations,
} from "./dashboard-data";

const PAGE_SIZE = 100;

type MetricCardProps = {
	description: string;
	icon: LucideIcon;
	label: string;
	value: number;
};

function MetricCard({
	description,
	icon: Icon,
	label,
	value,
}: MetricCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{label}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<div className="flex size-9 items-center justify-center bg-muted text-muted-foreground">
						<Icon className="size-4" aria-hidden="true" />
					</div>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p className="font-semibold text-3xl tabular-nums">{value}</p>
			</CardContent>
		</Card>
	);
}

function DashboardLoading() {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-4 w-80 max-w-full" />
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				{["leads", "jobs", "follow-ups"].map((metric) => (
					<Card key={metric}>
						<CardHeader>
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-9 w-16" />
						</CardHeader>
					</Card>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
				<Skeleton className="h-80 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</main>
	);
}

function RecordList({
	description,
	emptyDescription,
	emptyTitle,
	icon: Icon,
	records,
	title,
}: {
	description: string;
	emptyDescription: string;
	emptyTitle: string;
	icon: LucideIcon;
	records: DashboardRecord[];
	title: string;
}) {
	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				{records.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Icon aria-hidden="true" />
							</EmptyMedia>
							<EmptyTitle>{emptyTitle}</EmptyTitle>
							<EmptyDescription>{emptyDescription}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="divide-y divide-border">
						{records.map((record) => (
							<li
								className="flex min-w-0 items-center justify-between gap-4 px-4 py-3"
								key={record.id}
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-sm">
										{record.title || record.identifier}
									</p>
									<p className="truncate font-mono text-muted-foreground text-xs">
										{record.identifier}
									</p>
								</div>
								<p className="shrink-0 text-right text-muted-foreground text-xs">
									{humanizeState(record.state)}
								</p>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function QuickActions() {
	const actions = [
		{
			description: "Add an inquiry to the live pipeline",
			href: "#new-lead",
			icon: UserPlus,
			label: "Capture lead",
		},
		{
			description: "Open the next piece of awarded work",
			href: "#new-job",
			icon: BriefcaseBusiness,
			label: "Create job",
		},
		{
			description: "Bill work tied to a real job",
			href: "#new-invoice",
			icon: ReceiptText,
			label: "Create invoice",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Quick actions</CardTitle>
				<CardDescription>
					Move work forward without leaving the dashboard.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{actions.map(({ description, href, icon: Icon, label }) => (
					<a
						className={buttonVariants({
							className:
								"h-auto min-h-14 justify-start whitespace-normal px-3 py-2 text-left",
							variant: "outline",
						})}
						href={href}
						key={href}
					>
						<Icon data-icon="inline-start" aria-hidden="true" />
						<span className="min-w-0 flex-1">
							<span className="block font-medium">{label}</span>
							<span className="block text-muted-foreground text-xs">
								{description}
							</span>
						</span>
						<ArrowRight data-icon="inline-end" aria-hidden="true" />
					</a>
				))}
				<a className={buttonVariants({ variant: "link" })} href="/pipeline">
					Review the lead pipeline
					<ArrowRight data-icon="inline-end" aria-hidden="true" />
				</a>
			</CardContent>
		</Card>
	);
}

function FormSurface({
	children,
	description,
	id,
	title,
}: {
	children: ReactNode;
	description: string;
	id: string;
	title: string;
}) {
	return (
		<Card className="scroll-mt-6" id={id}>
			<CardHeader className="border-b">
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="[&_form>h3]:sr-only [&_form]:!gap-3 [&_input]:!rounded-none [&_input]:!border-border [&_input]:!bg-background [&_input]:!p-2.5 [&_textarea]:!rounded-none [&_textarea]:!border-border [&_textarea]:!bg-background [&_textarea]:!p-2.5 [&_form>button]:!min-h-9 [&_form>button]:!rounded-none [&_form>button]:!bg-primary [&_form>button]:!px-3 [&_form>button]:!py-2 [&_form>button]:!text-primary-foreground">
				{children}
			</CardContent>
		</Card>
	);
}

function OperationsDashboard() {
	const user = useUser();
	const leadsResult = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: PAGE_SIZE, cursor: null },
	});
	const jobsResult = useQuery(api.backend.listJobs, {
		paginationOpts: { numItems: PAGE_SIZE, cursor: null },
	});

	if (leadsResult === undefined || jobsResult === undefined) {
		return <DashboardLoading />;
	}

	const leads = leadsResult.page as DashboardRecord[];
	const jobs = jobsResult.page as DashboardRecord[];
	const metrics = summarizeOperations(leads, jobs);
	const leadScope = pageScopeLabel(leads.length, leadsResult.isDone);
	const jobScope = pageScopeLabel(jobs.length, jobsResult.isDone);
	const operatorName =
		user.user?.firstName || user.user?.fullName || "operator";

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
				<div className="flex flex-col gap-1">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Painter OS operations
					</p>
					<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
						Welcome back, {operatorName}
					</h1>
					<p className="max-w-2xl text-muted-foreground text-sm">
						Live pipeline and job workload for your painting business.
					</p>
				</div>
				<div className="flex items-center gap-3 self-end sm:self-auto">
					<p className="text-muted-foreground text-xs">Live from Convex</p>
					<UserButton />
				</div>
			</header>

			<section
				aria-label="Operational metrics"
				className="grid gap-4 sm:grid-cols-3"
			>
				<MetricCard
					description={leadScope}
					icon={UsersRound}
					label="Open leads"
					value={metrics.openLeads}
				/>
				<MetricCard
					description={jobScope}
					icon={Paintbrush}
					label="Active jobs"
					value={metrics.activeJobs}
				/>
				<MetricCard
					description={`${leadScope}; replies, qualification, and site visits`}
					icon={ClipboardList}
					label="Needs follow-up"
					value={metrics.followUps}
				/>
			</section>

			<section
				aria-label="Current operations"
				className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]"
			>
				<div className="grid gap-4 xl:grid-cols-2">
					<RecordList
						description={leadScope}
						emptyDescription="Capture the next inquiry to start the pipeline."
						emptyTitle="No leads yet"
						icon={UsersRound}
						records={sortRecent(leads)}
						title="Recent leads"
					/>
					<RecordList
						description={jobScope}
						emptyDescription="Create a job when awarded work is ready to schedule."
						emptyTitle="No jobs yet"
						icon={BriefcaseBusiness}
						records={sortRecent(jobs)}
						title="Current jobs"
					/>
				</div>
				<QuickActions />
			</section>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="create-work-title"
			>
				<div>
					<h2 className="font-semibold text-lg" id="create-work-title">
						Create work
					</h2>
					<p className="text-muted-foreground text-sm">
						Each form writes through the existing tenant-scoped Convex mutation.
					</p>
				</div>
				<div className="grid items-start gap-4 lg:grid-cols-3">
					<FormSurface
						description="Capture a qualified inquiry."
						id="new-lead"
						title="New lead"
					>
						<CreateLeadForm />
					</FormSurface>
					<FormSurface
						description="Open awarded work for operations."
						id="new-job"
						title="New job"
					>
						<CreateJobForm />
					</FormSurface>
					<FormSurface
						description="Bill completed or in-progress work."
						id="new-invoice"
						title="New invoice"
					>
						<CreateInvoiceForm />
					</FormSurface>
				</div>
			</section>
		</main>
	);
}

export default function Dashboard() {
	return (
		<>
			<Authenticated>
				<OperationsDashboard />
			</Authenticated>
			<Unauthenticated>
				<main className="mx-auto flex min-h-[60vh] w-full max-w-lg items-center px-4 py-12 sm:px-6">
					<Card className="w-full">
						<CardHeader>
							<FileText
								className="size-5 text-muted-foreground"
								aria-hidden="true"
							/>
							<CardTitle>Sign in to open Painter OS</CardTitle>
							<CardDescription>
								Your business pipeline, jobs, and invoices are available after
								sign-in.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<SignInButton>
								<Button>Sign in</Button>
							</SignInButton>
						</CardContent>
					</Card>
				</main>
			</Unauthenticated>
			<AuthLoading>
				<DashboardLoading />
			</AuthLoading>
		</>
	);
}
