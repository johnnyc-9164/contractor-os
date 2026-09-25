"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import Link from "next/link";
import { MorningBriefing } from "../../components/dashboard/morning-briefing";
import { NavRail } from "../../components/dashboard/nav-rail";
import { StatCards } from "../../components/dashboard/stat-cards";
import type { HistoryEvent, Lead } from "../../components/dashboard/types";

function DashboardContent() {
	const user = useUser();
	const leadsResult = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 100, cursor: null },
	});
	const historyResult = useQuery(api.backend.history, {
		paginationOpts: { numItems: 50, cursor: null },
	});

	const leads = leadsResult?.page as Lead[] | undefined;
	const history = historyResult?.page as HistoryEvent[] | undefined;

	const today = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="min-h-screen">
			<NavRail />
			<div className="pl-[280px]">
				<main className="mx-auto max-w-6xl space-y-8 p-8">
					<header className="flex items-center justify-between">
						<div>
							<h1 className="font-semibold text-2xl tracking-tight">
								Good morning
								{user.user?.firstName ? `, ${user.user.firstName}` : ""}
							</h1>
							<p className="mt-1 text-muted-foreground text-sm">{today}</p>
						</div>
						<UserButton />
					</header>

					<section aria-label="Pipeline stats">
						<StatCards leads={leads} />
					</section>

					<section aria-label="Morning briefing">
						<h2 className="mb-4 font-semibold text-lg tracking-tight">
							Morning briefing
						</h2>
						{leads !== undefined && leads.length === 0 ? (
							<div className="rounded-md border border-dashed p-8 text-center">
								<p className="font-medium text-sm">No leads yet</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Add your first lead to start the pipeline.
								</p>
								<Link
									href="/leads"
									className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
								>
									Go to Leads
								</Link>
							</div>
						) : (
							<MorningBriefing leads={leads} history={history} />
						)}
					</section>
				</main>
			</div>
		</div>
	);
}

export default function Dashboard() {
	return (
		<>
			<Authenticated>
				<DashboardContent />
			</Authenticated>
			<Unauthenticated>
				<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
					<h1 className="font-semibold text-2xl tracking-tight">Painter OS</h1>
					<p className="text-muted-foreground text-sm">
						Sign in to access your dashboard.
					</p>
					<SignInButton />
				</div>
			</Unauthenticated>
			<AuthLoading>
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground text-sm">Loading...</p>
				</div>
			</AuthLoading>
		</>
	);
}
