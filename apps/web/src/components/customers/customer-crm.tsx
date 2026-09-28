"use client";

import { Avatar, AvatarFallback } from "@contractor-os/ui/components/avatar";
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
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@contractor-os/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@contractor-os/ui/components/input-group";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@contractor-os/ui/components/sheet";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import { ArrowUpRight, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	type CustomerRecord,
	customerInitials,
	filterCustomers,
	type LeadListRecord,
	selectCustomers,
} from "./customer-crm-model";

type CustomerCrmProps = {
	leads: LeadListRecord[];
	status: "loading" | "ready" | "loading-more";
	hasMore: boolean;
	onLoadMore: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

function CustomerListLoading() {
	return (
		<div
			aria-label="Loading customers"
			aria-live="polite"
			className="flex flex-col gap-0"
			role="status"
		>
			{Array.from({ length: 5 }, (_, index) => (
				<div
					className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-border border-b px-4 py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_9rem_6rem] sm:px-5"
					key={`customer-loading-${index}`}
				>
					<Skeleton className="size-9 rounded-full" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-3 w-44 max-w-full" />
						<Skeleton className="h-3 w-28 max-w-full" />
					</div>
					<Skeleton className="hidden h-3 w-24 sm:block" />
					<Skeleton className="hidden h-3 w-12 sm:block" />
				</div>
			))}
		</div>
	);
}

function CustomerRow({
	customer,
	onSelect,
}: {
	customer: CustomerRecord;
	onSelect: (customer: CustomerRecord) => void;
}) {
	return (
		<button
			aria-haspopup="dialog"
			className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-border border-b px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[auto_minmax(0,1fr)_9rem_6rem] sm:px-5"
			onClick={() => onSelect(customer)}
			type="button"
		>
			<Avatar aria-hidden="true">
				<AvatarFallback>{customerInitials(customer)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">
					{customer.title?.trim() || "Untitled won lead"}
				</p>
				<p className="mt-1 truncate font-mono text-muted-foreground text-xs">
					{customer.identifier}
				</p>
				<p className="mt-1 text-muted-foreground text-xs sm:hidden">
					Updated {dateFormatter.format(customer.updatedAt)}
				</p>
			</div>
			<time
				className="hidden text-muted-foreground text-xs sm:block"
				dateTime={new Date(customer.updatedAt).toISOString()}
			>
				{dateFormatter.format(customer.updatedAt)}
			</time>
			<p className="hidden text-right text-muted-foreground text-xs tabular-nums sm:block">
				Rev. {customer.revision}
			</p>
		</button>
	);
}

function CustomerDetail({
	customer,
	onClose,
}: {
	customer: CustomerRecord | null;
	onClose: () => void;
}) {
	return (
		<Sheet
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open={customer !== null}
		>
			<SheetContent className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>
						{customer?.title?.trim() || "Untitled won lead"}
					</SheetTitle>
					<SheetDescription>
						Read-only customer view from the converted lead record.
					</SheetDescription>
				</SheetHeader>
				{customer ? (
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6">
						<Card size="sm">
							<CardHeader className="border-b">
								<CardTitle>Record details</CardTitle>
								<CardDescription>
									Only fields returned by the live lead list are shown.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<dl className="flex flex-col gap-4">
									<div className="flex flex-col gap-1">
										<dt className="text-muted-foreground text-xs">
											Lifecycle state
										</dt>
										<dd className="font-medium text-sm">Won</dd>
									</div>
									<div className="flex flex-col gap-1">
										<dt className="text-muted-foreground text-xs">
											Stable identifier
										</dt>
										<dd className="break-all font-mono text-sm">
											{customer.identifier}
										</dd>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="flex flex-col gap-1">
											<dt className="text-muted-foreground text-xs">
												Revision
											</dt>
											<dd className="text-sm tabular-nums">
												{customer.revision}
											</dd>
										</div>
										<div className="flex flex-col gap-1">
											<dt className="text-muted-foreground text-xs">Updated</dt>
											<dd className="text-sm">
												<time
													dateTime={new Date(customer.updatedAt).toISOString()}
												>
													{dateFormatter.format(customer.updatedAt)}
												</time>
											</dd>
										</div>
									</div>
								</dl>
							</CardContent>
						</Card>
						<p className="text-muted-foreground text-xs/relaxed">
							Contact details, notes, job totals, and messages are not available
							from the current customer read contract, so this view does not
							infer them.
						</p>
					</div>
				) : null}
				<SheetFooter>
					<Button onClick={onClose} variant="outline">
						Close
					</Button>
					{customer ? (
						<Link
							className={buttonVariants()}
							href={`/leads/${encodeURIComponent(customer.identifier)}`}
						>
							Open lead record
							<ArrowUpRight data-icon="inline-end" />
						</Link>
					) : null}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export function CustomerCrm({
	leads,
	status,
	hasMore,
	onLoadMore,
}: CustomerCrmProps) {
	const [query, setQuery] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
		null,
	);
	const customers = useMemo(() => selectCustomers(leads), [leads]);
	const visibleCustomers = useMemo(
		() => filterCustomers(customers, query),
		[customers, query],
	);
	const selectedCustomer = selectedCustomerId
		? (customers.find(
				(customer) => customer.identifier === selectedCustomerId,
			) ?? null)
		: null;
	const isInitialLoading = status === "loading";

	return (
		<>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
				<div className="min-w-0">
					<label className="sr-only" htmlFor="customer-search">
						Search converted customers
					</label>
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>
								<Search aria-hidden="true" />
							</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							autoComplete="off"
							id="customer-search"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search lead title or identifier"
							type="search"
							value={query}
						/>
					</InputGroup>
				</div>
				<Card size="sm">
					<CardHeader>
						<CardTitle>Converted customers</CardTitle>
						<CardDescription>Won leads in loaded records</CardDescription>
						<CardAction className="font-semibold text-2xl tabular-nums">
							{customers.length}
						</CardAction>
					</CardHeader>
				</Card>
			</div>

			<Card className="mt-5">
				<CardHeader className="border-b">
					<CardTitle>Customer worklist</CardTitle>
					<CardDescription>
						This view uses won leads until a dedicated account and contact read
						contract is available.
						{hasMore
							? " Search covers loaded leads; more records are available."
							: null}
					</CardDescription>
				</CardHeader>
				<CardContent className="px-0">
					{!isInitialLoading ? (
						<p className="sr-only" role="status">
							{visibleCustomers.length} matching won leads in loaded records
							{hasMore ? "; more records are available" : ""}.
						</p>
					) : null}
					{isInitialLoading ? (
						<CustomerListLoading />
					) : customers.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<UsersRound aria-hidden="true" />
								</EmptyMedia>
								<EmptyTitle>
									{hasMore
										? "No won leads in loaded records"
										: "No converted customers yet"}
								</EmptyTitle>
								<EmptyDescription>
									{hasMore
										? "Load more records to continue looking for won leads."
										: "Leads marked Won in the live pipeline will appear here."}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : visibleCustomers.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>
									{hasMore
										? "No matches in loaded records"
										: "No matching customers"}
								</EmptyTitle>
								<EmptyDescription>
									{hasMore
										? "Load more records or try another lead title or identifier."
										: "Try another lead title or identifier."}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button onClick={() => setQuery("")} variant="outline">
									Clear search
								</Button>
							</EmptyContent>
						</Empty>
					) : (
						<div>
							<div className="hidden grid-cols-[auto_minmax(0,1fr)_9rem_6rem] gap-3 border-border border-b bg-muted/40 px-5 py-2 text-muted-foreground text-xs sm:grid">
								<span className="size-8" aria-hidden="true" />
								<span>Won lead</span>
								<span>Updated</span>
								<span className="text-right">Revision</span>
							</div>
							{visibleCustomers.map((customer) => (
								<CustomerRow
									customer={customer}
									key={customer.id}
									onSelect={(selected) =>
										setSelectedCustomerId(selected.identifier)
									}
								/>
							))}
						</div>
					)}
				</CardContent>
				{hasMore ? (
					<div className="flex justify-center border-border border-t p-4">
						<Button
							disabled={status === "loading-more"}
							onClick={onLoadMore}
							variant="outline"
						>
							{status === "loading-more"
								? "Loading more leads"
								: "Load more leads"}
						</Button>
					</div>
				) : null}
			</Card>

			<CustomerDetail
				customer={selectedCustomer}
				onClose={() => setSelectedCustomerId(null)}
			/>
		</>
	);
}
