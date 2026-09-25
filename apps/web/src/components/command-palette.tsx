"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { cn } from "@contractor-os/ui/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { useQuery } from "convex/react";
import {
	CalendarPlusIcon,
	KanbanSquareIcon,
	LayoutDashboardIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

type LeadSummary = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
};

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			className={cn(
				"flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			className="flex items-center gap-2 border-border border-b px-4"
			data-slot="command-input-wrapper"
		>
			<SearchIcon className="size-4 shrink-0 opacity-50" />
			<CommandPrimitive.Input
				className={cn(
					"flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			className={cn(
				"max-h-[320px] overflow-y-auto overscroll-contain p-2",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			className={cn(
				"py-8 text-center text-muted-foreground text-sm",
				className,
			)}
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			className={cn(
				"overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs",
				className,
			)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-2 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

function formatStage(state: string): string {
	return state
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function fuzzyScore(haystack: string, needle: string): number {
	if (!needle) return 1;
	const lowerHaystack = haystack.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	let score = 0;
	let needleIndex = 0;
	for (
		let i = 0;
		i < lowerHaystack.length && needleIndex < lowerNeedle.length;
		i++
	) {
		if (lowerHaystack[i] === lowerNeedle[needleIndex]) {
			score += 1;
			needleIndex += 1;
		}
	}
	return needleIndex === lowerNeedle.length ? score : 0;
}

export function CommandPalette() {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const router = useRouter();
	const leadsResult = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 50, cursor: null },
	});
	const leads = React.useMemo<LeadSummary[]>(
		() => (leadsResult?.page ?? []) as LeadSummary[],
		[leadsResult],
	);

	const filteredLeads = React.useMemo(() => {
		if (!search.trim()) return leads;
		return leads
			.map((lead) => ({
				lead,
				score: fuzzyScore(
					`${lead.title ?? ""} ${lead.identifier} ${formatStage(lead.state)}`,
					search,
				),
			}))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.map(({ lead }) => lead);
	}, [leads, search]);

	const scheduleTarget = filteredLeads[0] ?? null;

	React.useEffect(() => {
		if (!open) setSearch("");
	}, [open]);

	React.useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((current) => !current);
			}
			if (event.key === "Escape") setOpen(false);
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	function navigate(href: Route) {
		setOpen(false);
		router.push(href);
	}

	const leadHref = (lead: LeadSummary): Route =>
		`/leads/${encodeURIComponent(lead.identifier)}` as Route;

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
			<button
				type="button"
				aria-label="Close command palette"
				className="absolute inset-0 cursor-default bg-black/50"
				onClick={() => setOpen(false)}
			/>
			<div
				className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-label="Command palette"
			>
				<Command label="Command palette" shouldFilter={false}>
					<CommandInput
						placeholder="Search leads or type a command…"
						value={search}
						autoFocus
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>No leads or actions match.</CommandEmpty>
						<CommandGroup heading="Actions">
							<CommandItem
								value="go to pipeline"
								onSelect={() => navigate("/leads")}
							>
								<KanbanSquareIcon />
								<span>Go to Pipeline</span>
							</CommandItem>
							<CommandItem
								value="go to dashboard"
								onSelect={() => navigate("/dashboard")}
							>
								<LayoutDashboardIcon />
								<span>Go to Dashboard</span>
							</CommandItem>
							<CommandItem
								value="new lead"
								onSelect={() => navigate("/dashboard")}
							>
								<PlusIcon />
								<span>New lead</span>
								<span className="ml-auto text-muted-foreground text-xs">
									Opens the lead capture form
								</span>
							</CommandItem>
							{scheduleTarget ? (
								<CommandItem
									key={`schedule-${scheduleTarget.id}`}
									value={`schedule site visit ${scheduleTarget.title ?? scheduleTarget.identifier}`}
									onSelect={() => navigate(leadHref(scheduleTarget))}
								>
									<CalendarPlusIcon />
									<span>Schedule site visit</span>
									<span className="ml-auto truncate text-muted-foreground text-xs">
										{scheduleTarget.title ?? scheduleTarget.identifier}
									</span>
								</CommandItem>
							) : null}
						</CommandGroup>
						<CommandGroup heading="Leads">
							{filteredLeads.map((lead) => (
								<CommandItem
									key={lead.id}
									value={`${lead.title ?? ""} ${lead.identifier} ${formatStage(lead.state)}`}
									onSelect={() => navigate(leadHref(lead))}
								>
									<span className="truncate font-medium">
										{lead.title ?? lead.identifier}
									</span>
									<span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground text-xs">
										{formatStage(lead.state)}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</div>
		</div>
	);
}
