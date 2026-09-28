// TC-APP-01: Live lead work surface for the painting lifecycle.
// S36 supplies the layout direction; Convex data and catalog dispatch remain
// authoritative for records, tenant boundaries, and legal stage transitions.

"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@contractor-os/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@contractor-os/ui/components/input-group";
import { Skeleton } from "@contractor-os/ui/components/skeleton";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
	ArchiveIcon,
	SearchIcon,
	SlidersHorizontalIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMembership } from "../membership-provider";
import {
	Kanban,
	KanbanBoard,
	KanbanColumn,
	KanbanColumnContent,
	KanbanColumnHandle,
	KanbanItem,
	KanbanItemHandle,
	type KanbanMoveEvent,
	KanbanOverlay,
} from "./kanban";
import { LeadCard, type PipelineLead } from "./lead-card";
import { LeadDetailsSheet } from "./lead-details-sheet";
import {
	countLeads,
	filterLeadColumns,
	findLeadById,
	type LeadColumns,
	leadMatchesQuery,
	mergeReopenedLeads,
	type ReopenedLead,
	reopenedLeadFromResult,
} from "./pipeline-view";
import { type PendingTransition, TransitionDialog } from "./transition-dialog";
import {
	BOARD_COLUMNS,
	DIALOG_FIELDS,
	isLegalTransition,
	type LeadStage,
	needsDialog,
	opForTransition,
	TERMINAL_STAGES,
} from "./transitions";

interface HistoryEvent {
	id: string;
	identifier: string;
	actorId: string;
	occurredAt: number;
}

interface LeadRecord {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	updatedAt: number;
}

function toLeadStage(state: string): LeadStage | null {
	const normalized = state.trim();
	const all: LeadStage[] = [...BOARD_COLUMNS, ...TERMINAL_STAGES];
	return (all as string[]).includes(normalized)
		? (normalized as LeadStage)
		: null;
}

function findLead(columns: LeadColumns, leadId: string) {
	for (const [stage, items] of Object.entries(columns)) {
		const index = items.findIndex((lead) => lead.id === leadId);
		if (index >= 0) {
			return { stage: stage as LeadStage, index, lead: items[index] };
		}
	}
	return null;
}

function applyMove(
	columns: LeadColumns,
	from: LeadStage,
	to: LeadStage,
	leadId: string,
): LeadColumns {
	const next: LeadColumns = { ...columns };
	const fromItems = [...(next[from] ?? [])];
	const index = fromItems.findIndex((lead) => lead.id === leadId);
	if (index < 0) return columns;

	const [moved] = fromItems.splice(index, 1);
	next[from] = fromItems;

	if (from !== to) {
		if ((BOARD_COLUMNS as string[]).includes(to)) {
			next[to] = [...(next[to] ?? []), { ...moved, stage: to }];
		}
	} else {
		fromItems.splice(index, 0, moved);
		next[from] = fromItems;
	}

	return next;
}

function PipelineLoading() {
	return (
		<div
			className="grid auto-cols-[min(84vw,20rem)] grid-flow-col gap-4 overflow-hidden"
			role="status"
			aria-live="polite"
		>
			<span className="sr-only">Loading lead pipeline</span>
			{BOARD_COLUMNS.slice(0, 3).map((stage) => (
				<div key={stage} className="flex flex-col gap-3 border p-3">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-36 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			))}
		</div>
	);
}

export function PipelineBoard() {
	const { role } = useMembership();
	const isPrincipal = role === "admin";

	const {
		results: leadRecords,
		status: leadPaginationStatus,
		loadMore: loadMoreLeads,
	} = usePaginatedQuery(api.backend.listLeads, {}, { initialNumItems: 100 });
	const {
		results: historyEvents,
		status: historyPaginationStatus,
		loadMore: loadMoreHistory,
	} = usePaginatedQuery(api.backend.history, {}, { initialNumItems: 100 });
	const dispatch = useMutation(api.catalog.dispatch);

	useEffect(() => {
		if (leadPaginationStatus === "CanLoadMore") {
			loadMoreLeads(100);
		}
	}, [leadPaginationStatus, loadMoreLeads]);

	useEffect(() => {
		if (historyPaginationStatus === "CanLoadMore") {
			loadMoreHistory(100);
		}
	}, [historyPaginationStatus, loadMoreHistory]);

	const [columns, setColumns] = useState<LeadColumns | null>(null);
	const [reopenedLeads, setReopenedLeads] = useState<ReopenedLead[]>([]);
	const [stageOverrides, setStageOverrides] = useState<
		Record<string, LeadStage>
	>({});
	const [query, setQuery] = useState("");
	const [showTerminal, setShowTerminal] = useState(false);
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
	const [pending, setPending] = useState<PendingTransition | null>(null);
	const [pendingMove, setPendingMove] = useState<{
		from: LeadStage;
		to: LeadStage;
		lead: PipelineLead;
	} | null>(null);

	const lastHandledBy = useMemo(() => {
		const map = new Map<string, HistoryEvent>();
		// Partial tenant history cannot give a reliable latest handler for search.
		if (historyPaginationStatus !== "Exhausted") return map;
		for (const event of historyEvents as HistoryEvent[]) {
			const previous = map.get(event.identifier);
			if (!previous || event.occurredAt > previous.occurredAt) {
				map.set(event.identifier, event);
			}
		}
		return map;
	}, [historyEvents, historyPaginationStatus]);

	useEffect(() => {
		if (leadPaginationStatus !== "Exhausted") return;

		setStageOverrides((current) => {
			let changed = false;
			const next = { ...current };
			const liveStages = new Map(
				(leadRecords as LeadRecord[]).map((record) => [
					record.id,
					toLeadStage(record.state),
				]),
			);

			for (const [leadId, target] of Object.entries(current)) {
				const liveStage = liveStages.get(leadId);
				if (!liveStage || liveStage === target) {
					delete next[leadId];
					changed = true;
				}
			}

			return changed ? next : current;
		});
	}, [leadPaginationStatus, leadRecords]);

	const projectedLeads = useMemo<PipelineLead[] | null>(() => {
		if (leadPaginationStatus !== "Exhausted") return null;

		const componentLeads: PipelineLead[] = [];
		for (const record of leadRecords as LeadRecord[]) {
			const liveStage = toLeadStage(record.state);
			if (!liveStage) continue;
			componentLeads.push({
				id: record.id,
				identifier: record.identifier,
				title: record.title,
				stage: liveStage,
				updatedAt: record.updatedAt,
				lastHandledBy: lastHandledBy.get(record.identifier)?.actorId ?? null,
			});
		}
		return mergeReopenedLeads(componentLeads, reopenedLeads).map((lead) => ({
			...lead,
			stage: stageOverrides[lead.id] ?? lead.stage,
		}));
	}, [
		leadPaginationStatus,
		leadRecords,
		lastHandledBy,
		reopenedLeads,
		stageOverrides,
	]);

	const seeded = useMemo<LeadColumns | null>(() => {
		if (!projectedLeads) return null;

		const nextColumns: LeadColumns = {};
		for (const stage of BOARD_COLUMNS) nextColumns[stage] = [];
		for (const lead of projectedLeads) {
			if (!TERMINAL_STAGES.includes(lead.stage)) {
				nextColumns[lead.stage].push(lead);
			}
		}
		return nextColumns;
	}, [projectedLeads]);

	const activeColumns = columns ?? seeded;

	const terminalLeads = useMemo(
		() =>
			(projectedLeads ?? []).filter((lead) =>
				TERMINAL_STAGES.includes(lead.stage),
			),
		[projectedLeads],
	);

	const selectedLead = useMemo(
		() => findLeadById(seeded ?? {}, terminalLeads, selectedLeadId),
		[seeded, selectedLeadId, terminalLeads],
	);

	const displayedColumns = useMemo(
		() => (activeColumns ? filterLeadColumns(activeColumns, query) : null),
		[activeColumns, query],
	);
	const displayedTerminalLeads = useMemo(
		() => terminalLeads.filter((lead) => leadMatchesQuery(lead, query)),
		[query, terminalLeads],
	);

	const runDispatch = async (
		contract: string,
		payload: Record<string, unknown>,
		rollbackTo: LeadColumns,
		successMove: { lead: PipelineLead; to: LeadStage },
		successLabel: string,
	) => {
		let result: {
			ok: boolean;
			blockers?: Array<{ message?: string }>;
			record_id?: string | null;
			entity_refs?: string[];
			executor?: string | null;
			updated_at?: string;
		};
		try {
			result = await dispatch({
				contract,
				schema_version: 1,
				idempotency_key: crypto.randomUUID(),
				payload,
			});
		} catch (error) {
			setColumns(rollbackTo);
			toast.error(
				`Move failed: ${error instanceof Error ? error.message : "unknown error"}`,
			);
			return;
		}

		if (!result.ok) {
			setColumns(rollbackTo);
			const reason =
				result.blockers?.[0]?.message ?? "blocked by the server guard";
			toast.error(`Move blocked: ${reason}`);
			return;
		}

		const updatedAt = Date.parse(result.updated_at ?? "");
		const timestamp = Number.isNaN(updatedAt) ? Date.now() : updatedAt;
		if (contract === "lead.reopen") {
			const newLead = reopenedLeadFromResult(
				successMove.lead,
				result.record_id ?? null,
				result.executor ?? null,
				timestamp,
			);
			if (!newLead) {
				setColumns(rollbackTo);
				toast.error("The reopened lead has no returned record ID.");
				return;
			}
			setReopenedLeads((current) => [
				...current.filter(({ lead }) => lead.id !== newLead.id),
				{ lead: newLead, componentIdentifier: null },
			]);
		} else {
			// Reopened leads live in the local lead table until qualifying
			// publishes a new component record with its own identifier.
			setReopenedLeads((current) =>
				current.map((entry) => {
					if (entry.lead.id !== successMove.lead.id) return entry;
					const componentIdentifier =
						contract === "lead.qualify"
							? (result.entity_refs?.find((ref) => ref !== result.record_id) ??
								entry.componentIdentifier)
							: entry.componentIdentifier;
					return {
						lead: {
							...entry.lead,
							stage: successMove.to,
							updatedAt: timestamp,
							lastHandledBy: result.executor ?? entry.lead.lastHandledBy,
						},
						componentIdentifier,
					};
				}),
			);
			setStageOverrides((current) => ({
				...current,
				[successMove.lead.id]: successMove.to,
			}));
		}
		setColumns(null);
		toast.success(successLabel);
	};

	const requestTransition = (lead: PipelineLead, to: LeadStage) => {
		if (!activeColumns) return;

		if (!isLegalTransition(lead.stage, to)) {
			toast.error(`Cannot move a lead from ${lead.stage} to ${to}.`);
			return;
		}

		const contract = opForTransition(lead.stage, to);
		if (!contract) {
			toast.error(`No operation maps ${lead.stage} to ${to}.`);
			return;
		}

		if (
			(contract === "lead.award" || contract === "lead.win") &&
			!isPrincipal
		) {
			toast.error(
				"Awarding or winning a job requires principal authority. Ask an admin to complete this move.",
			);
			return;
		}

		setSelectedLeadId(null);

		if (needsDialog(contract)) {
			setPendingMove({ from: lead.stage, to, lead });
			setPending({
				leadId: lead.identifier,
				leadTitle: lead.title || lead.identifier,
				from: lead.stage,
				to,
				contract,
				fields: DIALOG_FIELDS[contract],
			});
			return;
		}

		const rollbackTo = activeColumns;
		const optimisticColumns = applyMove(activeColumns, lead.stage, to, lead.id);
		setColumns(optimisticColumns);
		void runDispatch(
			contract,
			{ lead_id: lead.identifier },
			rollbackTo,
			{ lead, to },
			`Moved to ${to}`,
		);
	};

	const handleMove = (event: KanbanMoveEvent) => {
		if (!activeColumns) return;

		const from = event.activeContainer as LeadStage;
		const to = event.overContainer as LeadStage;
		const found = findLead(activeColumns, event.event.active.id as string);
		if (!found) return;

		if (from === to) {
			// Card order is not persisted, so return to the reactive server order.
			setColumns(null);
			return;
		}

		requestTransition(found.lead, to);
	};

	const handleDialogConfirm = (payload: Record<string, unknown>) => {
		if (!pending || !pendingMove || !activeColumns) return;

		const { from, to, lead } = pendingMove;
		const contract = pending.contract;
		const rollbackTo = activeColumns;
		const optimisticColumns = applyMove(activeColumns, from, to, lead.id);
		setColumns(optimisticColumns);
		setPending(null);
		setPendingMove(null);
		void runDispatch(
			contract,
			payload,
			rollbackTo,
			{ lead, to },
			`Moved to ${to}`,
		);
	};

	const handleDialogCancel = () => {
		setPending(null);
		setPendingMove(null);
	};

	if (!activeColumns || !displayedColumns) {
		return <PipelineLoading />;
	}

	const hasQuery = query.trim().length > 0;
	const activeCount = countLeads(activeColumns);
	const displayedCount = countLeads(displayedColumns);

	return (
		<div className="flex min-w-0 flex-col gap-5">
			<div className="flex flex-col gap-3 border-y py-3 md:flex-row md:items-center md:justify-between">
				<InputGroup className="max-w-md">
					<InputGroupAddon>
						<SearchIcon aria-hidden="true" />
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={
							historyPaginationStatus === "Exhausted"
								? "Search leads or last handler"
								: "Search leads"
						}
						aria-label="Search leads"
					/>
					{hasQuery ? (
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								type="button"
								size="icon-xs"
								onClick={() => setQuery("")}
								aria-label="Clear lead search"
							>
								<XIcon data-icon="inline-start" />
							</InputGroupButton>
						</InputGroupAddon>
					) : null}
				</InputGroup>

				<div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
					<p className="text-muted-foreground text-xs" aria-live="polite">
						{hasQuery
							? `${displayedCount} matching active lead${displayedCount === 1 ? "" : "s"}`
							: `${activeCount} active lead${activeCount === 1 ? "" : "s"}`}
						{hasQuery ? " · Clear search to drag cards" : ""}
					</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => setShowTerminal((current) => !current)}
						aria-pressed={showTerminal}
					>
						<ArchiveIcon data-icon="inline-start" />
						{showTerminal ? "Hide" : "Show"} completed ({terminalLeads.length})
					</Button>
				</div>
			</div>

			<div className="flex items-start gap-2 text-muted-foreground text-xs [&>svg]:size-4 [&>svg]:shrink-0">
				<SlidersHorizontalIcon aria-hidden="true" />
				<p>
					Open a card for its live record and keyboard-accessible stage actions.
					Drag cards when search is clear. If a move cannot be completed, the
					card returns to its previous stage with the reason.
					{historyPaginationStatus !== "Exhausted"
						? " Last-handler search becomes available after history loads."
						: ""}
					{!isPrincipal
						? " Awarding or winning requires principal authority."
						: ""}
				</p>
			</div>

			{activeCount === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ArchiveIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No active leads</EmptyTitle>
						<EmptyDescription>
							New lead records will appear here as they enter the pipeline.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : displayedCount === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No matching active leads</EmptyTitle>
						<EmptyDescription>
							{historyPaginationStatus === "Exhausted"
								? "Try a lead name, record identifier, stage, or last handler."
								: "Try a lead name, record identifier, or stage."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<Kanban
					value={displayedColumns}
					onValueChange={hasQuery ? () => undefined : setColumns}
					getItemValue={(item) => item.id}
					onMove={handleMove}
				>
					<KanbanBoard className="grid snap-x auto-cols-[min(84vw,20rem)] grid-flow-col gap-4 overflow-x-auto pb-4 sm:auto-cols-[20rem]">
						{BOARD_COLUMNS.map((stage) => (
							<KanbanColumn
								key={stage}
								value={stage}
								className="flex max-h-[68vh] snap-start flex-col border bg-muted/30"
							>
								<KanbanColumnHandle className="flex items-center gap-2 border-b px-3 py-2.5">
									<span
										className="size-2 shrink-0 rounded-full bg-primary"
										aria-hidden="true"
									/>
									<h3 className="min-w-0 flex-1 truncate font-medium text-xs uppercase tracking-wide">
										{stage}
									</h3>
									<span className="text-muted-foreground text-xs tabular-nums">
										{displayedColumns[stage]?.length ?? 0}
									</span>
									{stage === "Awarded" && !isPrincipal ? (
										<span
											title="Awarding a job requires principal authority"
											className="cursor-help text-muted-foreground text-xs"
										>
											Locked
										</span>
									) : null}
								</KanbanColumnHandle>
								<KanbanColumnContent
									value={stage}
									className="flex min-h-28 flex-col gap-2 overflow-y-auto p-2"
								>
									{(displayedColumns[stage] ?? []).length > 0 ? (
										(displayedColumns[stage] ?? []).map((lead) => (
											<KanbanItem
												key={lead.id}
												value={lead.id}
												disabled={hasQuery}
												className="data-[disabled=true]:opacity-100"
											>
												{hasQuery ? (
													<LeadCard
														lead={lead}
														onSelect={(selected) =>
															setSelectedLeadId(selected.id)
														}
														onTerminalMove={requestTransition}
													/>
												) : (
													<KanbanItemHandle>
														<LeadCard
															lead={lead}
															onSelect={(selected) =>
																setSelectedLeadId(selected.id)
															}
															onTerminalMove={requestTransition}
														/>
													</KanbanItemHandle>
												)}
											</KanbanItem>
										))
									) : (
										<p className="px-2 py-6 text-center text-muted-foreground text-xs">
											{hasQuery
												? "No matching leads"
												: "No leads in this stage"}
										</p>
									)}
								</KanbanColumnContent>
							</KanbanColumn>
						))}
					</KanbanBoard>
					<KanbanOverlay>
						<div className="size-full bg-muted" />
					</KanbanOverlay>
				</Kanban>
			)}

			{showTerminal ? (
				<section aria-labelledby="completed-leads-heading">
					<div className="mb-3 flex items-end justify-between gap-3">
						<div>
							<h2
								id="completed-leads-heading"
								className="font-medium text-base"
							>
								Completed leads
							</h2>
							<p className="text-muted-foreground text-xs">
								Won, lost, and disqualified records.
							</p>
						</div>
						<span className="text-muted-foreground text-xs tabular-nums">
							{displayedTerminalLeads.length} shown
						</span>
					</div>

					{displayedTerminalLeads.length === 0 ? (
						<Empty className="border">
							<EmptyHeader>
								<EmptyTitle>
									{hasQuery
										? "No matching completed leads"
										: "No completed leads"}
								</EmptyTitle>
								<EmptyDescription>
									Completed lead records will stay available here for review.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{TERMINAL_STAGES.map((stage) => {
								const items = displayedTerminalLeads.filter(
									(lead) => lead.stage === stage,
								);
								if (items.length === 0) return null;

								return (
									<section key={stage} aria-labelledby={`completed-${stage}`}>
										<h3
											id={`completed-${stage}`}
											className="mb-2 font-medium text-xs uppercase tracking-wide"
										>
											{stage}{" "}
											<span className="text-muted-foreground">
												({items.length})
											</span>
										</h3>
										<div className="flex flex-col gap-2">
											{items.map((lead) => (
												<LeadCard
													key={lead.id}
													lead={lead}
													onSelect={(selected) =>
														setSelectedLeadId(selected.id)
													}
													onTerminalMove={requestTransition}
												/>
											))}
										</div>
									</section>
								);
							})}
						</div>
					)}
				</section>
			) : null}

			<LeadDetailsSheet
				lead={selectedLead}
				isPrincipal={isPrincipal}
				onOpenChange={(open) => {
					if (!open) setSelectedLeadId(null);
				}}
				onTransition={requestTransition}
			/>

			<TransitionDialog
				pending={pending}
				onConfirm={handleDialogConfirm}
				onCancel={handleDialogCancel}
			/>
		</div>
	);
}
