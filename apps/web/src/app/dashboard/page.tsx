"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";

function LeadsList() {
	const leads = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 20, cursor: null },
	});

	if (leads === undefined) return <div>Loading leads...</div>;
	if (leads.page.length === 0) return <div>No leads yet.</div>;

	return (
		<div>
			<h2>Leads ({leads.page.length})</h2>
			<ul>
				{leads.page.map(
					(lead: {
						id: string;
						identifier: string;
						title: string | null;
						state: string;
					}) => (
						<li key={lead.id}>
							<strong>{lead.title || lead.identifier}</strong> — {lead.state}
						</li>
					),
				)}
			</ul>
		</div>
	);
}

function JobsList() {
	const jobs = useQuery(api.backend.listJobs, {
		paginationOpts: { numItems: 20, cursor: null },
	});

	if (jobs === undefined) return <div>Loading jobs...</div>;
	if (jobs.page.length === 0) return <div>No jobs yet.</div>;

	return (
		<div>
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
				<div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
					<header
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "2rem",
						}}
					>
						<div>
							<h1>Contractor OS</h1>
							<p>Welcome {user.user?.fullName}</p>
						</div>
						<UserButton />
					</header>

					<main
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "2rem",
						}}
					>
						<section
							style={{
								border: "1px solid #e5e5e5",
								borderRadius: "8px",
								padding: "1.5rem",
							}}
						>
							<LeadsList />
						</section>
						<section
							style={{
								border: "1px solid #e5e5e5",
								borderRadius: "8px",
								padding: "1.5rem",
							}}
						>
							<JobsList />
						</section>
					</main>
				</div>
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
