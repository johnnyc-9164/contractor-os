"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	usePaginatedQuery,
} from "convex/react";
import { CustomerCrm } from "../../../components/customers/customer-crm";

function CustomersRoute() {
	const { results, status, loadMore } = usePaginatedQuery(
		api.backend.listLeads,
		{},
		{ initialNumItems: 50 },
	);

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<header className="mb-6 flex items-start justify-between gap-4">
				<div className="max-w-2xl">
					<p className="font-medium text-muted-foreground text-xs">
						Painter OS
					</p>
					<h1 className="mt-1 font-semibold text-2xl tracking-tight">
						Customers
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Find the won leads that have entered your customer book.
					</p>
				</div>
				<UserButton />
			</header>
			<CustomerCrm
				hasMore={status === "CanLoadMore"}
				leads={results}
				onLoadMore={() => loadMore(50)}
				status={
					status === "LoadingFirstPage"
						? "loading"
						: status === "LoadingMore"
							? "loading-more"
							: "ready"
				}
			/>
		</main>
	);
}

export default function CustomersPage() {
	return (
		<>
			<Authenticated>
				<CustomersRoute />
			</Authenticated>
			<Unauthenticated>
				<main className="mx-auto max-w-lg px-6 py-24 text-center">
					<h1 className="font-semibold text-2xl">Sign in to view customers</h1>
					<p className="mt-2 mb-6 text-muted-foreground text-sm">
						Your converted customer worklist is available after you sign in.
					</p>
					<SignInButton>
						<Button>Sign in</Button>
					</SignInButton>
				</main>
			</Unauthenticated>
			<AuthLoading>
				<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<p className="py-24 text-center text-muted-foreground text-sm">
						Checking access
					</p>
				</main>
			</AuthLoading>
		</>
	);
}
