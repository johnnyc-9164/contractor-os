// TC-APP-01: Kanban pipeline board for the painting lead lifecycle.
// Assembles the ReUI kanban (Radix flavor). Drags dispatch catalog ops;
// illegal transitions are refused at the pointer; blocked dispatches roll back.

"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
import { toLeadStage } from "./lead-stage-normalization";
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

type Columns = Record<string, PipelineLead[]>;

interface HistoryEvent {
	id: string;
	identifier: string;
	actorId: string;
	occurredAt: number;
}

export function PipelineBoard() {
	const { role } = useMembership();
	const isPrincipal = role === "admin";

	const leadsResult = useQuery(api.backend.listLeads, {
		paginationOpts: { numItems: 100, cursor: null },
	});
	const history = useQuery(api.backend.history, {
		paginationOpts: { numItems: 100, cursor: null },
	});
	const dispatch = useMutation(api.catalog.dispatch);

	const [columns, setColumns] = useState<Columns | null>(null);
	const [showTerminal, setShowTerminal] = useState(false);
	const [pending, setPending] = useState<PendingTransition | null>(null);
	// pendingMove.leadId is the board-internal card id (matches applyMove's
	// l.id lookup). The dispatch identifier lives on pending.leadId instead.
	const [pendingMove, setPendingMove] = useState<{
		from: LeadStage;
		to: LeadStage;
		leadId: string;
	} | null>(null);

	// Last handler per lead identifier, for the "owner/assigned" line.
	const lastHandledBy = useMemo(() => {
		const map = new Map<string, HistoryEvent>();
		for (const event of (history?.page ?? []) as HistoryEvent[]) {
			const prev = map.get(event.identifier);
			if (!prev || event.occurredAt > prev.occurredAt)
				map.set(event.identifier, event);
		}
		return map;
	}, [history]);

	// Seed columns from the query once; afterwards the board owns the state
	// optimistically and the query refreshes it on refetch.
	const seeded = useMemo<Columns | null>(() => {
		if (!leadsResult) return null;
		const cols: Columns = {};
		for (const s of BOARD_COLUMNS) cols[s] = [];
		for (const raw of (leadsResult.page ?? []) as Array<{
			id: string;
			identifier: string;
			title: string | null;
			state: string;
			updatedAt: number;
		}>) {
			const stage = toLeadStage(raw.state);
			if (!stage || TERMINAL_STAGES.includes(stage)) continue;
			cols[stage].push({
				id: raw.id,
				identifier: raw.identifier,
				title: raw.title,
				stage,
				updatedAt: raw.updatedAt,
				lastHandledBy: lastHandledBy.get(raw.identifier)?.actorId ?? null,
			});
		}
		return cols;
	}, [leadsResult, lastHandledBy]);

	const activeColumns = columns ?? seeded;

	const terminalLeads = useMemo<PipelineLead[]>(() => {
		if (!leadsResult) return [];
		const out: PipelineLead[] = [];
		for (const raw of (leadsResult.page ?? []) as Array<{
			id: string;
			identifier: string;
			title: string | null;
			state: string;
			updatedAt: number;
		}>) {
			const stage = toLeadStage(raw.state);
			if (!stage || !TERMINAL_STAGES.includes(stage)) continue;
			out.push({
				id: raw.id,
				identifier: raw.identifier,
				title: raw.title,
				stage,
				updatedAt: raw.updatedAt,
				lastHandledBy: lastHandledBy.get(raw.identifier)?.actorId ?? null,
			});
		}
		return out;
	}, [leadsResult, lastHandledBy]);

	const findLead = (cols: Columns, leadId: string) => {
		for (const [stage, items] of Object.entries(cols)) {
			const idx = items.findIndex((l) => l.id === leadId);
			if (idx >= 0)
				return { stage: stage as LeadStage, index: idx, lead: items[idx] };
		}
		return null;
	};

	const applyMove = (
		cols: Columns,
		from: LeadStage,
		to: LeadStage,
		leadId: string,
	): Columns => {
		const next: Columns = { ...cols };
		const fromItems = [...(next[from] ?? [])];
		const idx = fromItems.findIndex((l) => l.id === leadId);
		if (idx < 0) return cols;
		const [moved] = fromItems.splice(idx, 1);
		next[from] = fromItems;
		if (from !== to) {
			// Terminal stages are not board columns; a move there removes the card.
			if ((BOARD_COLUMNS as string[]).includes(to)) {
				next[to] = [...(next[to] ?? []), { ...moved, stage: to }];
			}
		} else {
			// Same-column reorder: put it back at the end (dnd-kit gives the
			// target index via onMove; we use it when provided).
			fromItems.splice(idx, 0, moved);
			next[from] = fromItems;
		}
		return next;
	};

	const runDispatch = async (
		contract: string,
		payload: Record<string, unknown>,
		rollbackTo: Columns,
		successLabel: string,
	) => {
		let result: { ok: boolean; blockers?: Array<{ message?: string }> };
		try {
			result = await dispatch({
				contract,
				schema_version: 1,
				idempotency_key: crypto.randomUUID(),
				payload,
			});
		} catch (err) {
			setColumns(rollbackTo);
			toast.error(
				`Move failed: ${err instanceof Error ? err.message : "unknown error"}`,
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
		toast.success(successLabel);
	};

	const handleMove = (event: KanbanMoveEvent) => {
		if (!activeColumns) return;
		const from = event.activeContainer as LeadStage;
		const to = event.overContainer as LeadStage;
		const found = findLead(activeColumns, event.event.active.id as string);
		if (!found) return;

		// Same-column reorder: apply locally, no op.
		if (from === to) {
			const next: Columns = { ...activeColumns };
			const items = [...next[from]];
			const [moved] = items.splice(found.index, 1);
			items.splice(event.overIndex, 0, moved);
			next[from] = items;
			setColumns(next);
			return;
		}

		// Refuse illegal transitions at the pointer.
		if (!isLegalTransition(from, to)) {
			toast.error(`Cannot move a lead from ${from} to ${to}.`);
			return;
		}

		const contract = opForTransition(from, to);
		if (!contract) {
			toast.error(`No operation maps ${from} to ${to}.`);
			return;
		}

		// lead.award is principal-only.
		if (contract === "lead.award" && !isPrincipal) {
			toast.error(
				"Awarding a job requires principal authority. Ask an admin to award this bid.",
			);
			return;
		}

		// Ops needing more than lead_id open the field dialog on drop.
		if (needsDialog(contract)) {
			setPendingMove({ from, to, leadId: found.lead.id });
			setPending({
				leadId: found.lead.identifier,
				leadTitle: found.lead.title || found.lead.identifier,
				from,
				to,
				contract,
				fields: DIALOG_FIELDS[contract],
			});
			return;
		}

		// Optimistic apply, then dispatch; roll back on a blocked envelope.
		const rollbackTo = activeColumns;
		setColumns(applyMove(activeColumns, from, to, found.lead.id));
		void runDispatch(
			contract,
			{ lead_id: found.lead.identifier },
			rollbackTo,
			`Moved to ${to}`,
		);
	};

	const handleDialogConfirm = (payload: Record<string, unknown>) => {
		if (!pending || !pendingMove || !activeColumns) return;
		const { from, to, leadId } = pendingMove;
		const contract = pending.contract;
		const rollbackTo = activeColumns;
		setColumns(applyMove(activeColumns, from, to, leadId));
		setPending(null);
		setPendingMove(null);
		void runDispatch(contract, payload, rollbackTo, `Moved to ${to}`);
	};

	const handleDialogCancel = () => {
		setPending(null);
		setPendingMove(null);
	};

	const handleTerminalMove = (lead: PipelineLead, to: LeadStage) => {
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
		// Terminal moves go through the dialog when fields are required.
		if (needsDialog(contract)) {
			setPendingMove({ from: lead.stage, to, leadId: lead.id });
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
		// lead.win needs only lead_id: apply (removes the card) and dispatch.
		const rollbackTo = activeColumns;
		setColumns(applyMove(activeColumns, lead.stage, to, lead.id));
		void runDispatch(
			contract,
			{ lead_id: lead.identifier },
			rollbackTo,
			`Moved to ${to}`,
		);
	};

	const handleReopen = (lead: PipelineLead) => {
		if (!activeColumns) return;
		if (!isLegalTransition(lead.stage, "Prospect")) {
			toast.error(`Cannot re-open a lead from ${lead.stage}.`);
			return;
		}
		// Re-open needs a reason; route through the dialog without a board move.
		setPendingMove({ from: lead.stage, to: "Prospect", leadId: lead.id });
		setPending({
			leadId: lead.identifier,
			leadTitle: lead.title || lead.identifier,
			from: lead.stage,
			to: "Prospect",
			contract: "lead.reopen",
			fields: DIALOG_FIELDS["lead.reopen"],
		});
	};

	if (!activeColumns) {
		return (
			<p className="py-16 text-center text-muted-foreground text-sm">
				Loading pipeline…
			</p>
		);
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					Drag a card to move the lead. Illegal moves are refused; blocked moves
					snap back with the reason.
					{!isPrincipal && (
						<span className="ml-2 font-medium text-foreground/80">
							Awarding requires principal authority.
						</span>
					)}
				</p>
				<button
					type="button"
					onClick={() => setShowTerminal((v) => !v)}
					aria-pressed={showTerminal}
					className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
				>
					{showTerminal ? "Hide" : "Show"} completed ({terminalLeads.length})
				</button>
			</div>

			<Kanban
				value={activeColumns}
				onValueChange={setColumns}
				getItemValue={(item) => item.id}
				onMove={handleMove}
			>
				<KanbanBoard className="grid auto-cols-[280px] grid-flow-col gap-4 overflow-x-auto pb-4">
					{BOARD_COLUMNS.map((stage) => (
						<KanbanColumn
							key={stage}
							value={stage}
							className="flex max-h-[70vh] flex-col rounded-lg border border-border bg-muted/30"
						>
							<KanbanColumnHandle className="flex items-center justify-between px-3 py-2">
								<h3 className="font-medium text-sm">{stage}</h3>
								<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
									{activeColumns[stage]?.length ?? 0}
								</span>
								{stage === "Awarded" && !isPrincipal && (
									<span
										title="Awarding a job requires principal authority"
										className="cursor-help text-muted-foreground text-xs"
									>
										Locked
									</span>
								)}
							</KanbanColumnHandle>
							<KanbanColumnContent
								value={stage}
								className="flex flex-col gap-2 overflow-y-auto p-2"
							>
								{(activeColumns[stage] ?? []).map((lead) => (
									<KanbanItem key={lead.id} value={lead.id}>
										<KanbanItemHandle>
											<LeadCard
												lead={lead}
												onTerminalMove={handleTerminalMove}
											/>
										</KanbanItemHandle>
									</KanbanItem>
								))}
							</KanbanColumnContent>
						</KanbanColumn>
					))}
				</KanbanBoard>
				<KanbanOverlay>
					<div className="size-full rounded-md bg-muted" />
				</KanbanOverlay>
			</Kanban>

			{showTerminal && (
				<section aria-label="Completed leads" className="mt-8">
					<h2 className="mb-3 font-medium text-base">Completed</h2>
					{terminalLeads.length === 0 ? (
						<p className="text-muted-foreground text-sm">No completed leads.</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{TERMINAL_STAGES.map((stage) => {
								const items = terminalLeads.filter((l) => l.stage === stage);
								if (items.length === 0) return null;
								return (
									<div
										key={stage}
										className="rounded-lg border border-border bg-muted/30 p-3"
									>
										<h3 className="mb-2 font-medium text-sm">
											{stage}{" "}
											<span className="text-muted-foreground">
												({items.length})
											</span>
										</h3>
										<div className="space-y-2">
											{items.map((lead) => (
												<div key={lead.id}>
													<LeadCard lead={lead} />
													{(stage === "Lost" || stage === "Disqualified") && (
														<button
															type="button"
															onClick={() => handleReopen(lead)}
															className="mt-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-muted"
														>
															Re-open as Prospect
														</button>
													)}
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>
			)}

			<TransitionDialog
				pending={pending}
				onConfirm={handleDialogConfirm}
				onCancel={handleDialogCancel}
			/>
		</div>
	);
}
