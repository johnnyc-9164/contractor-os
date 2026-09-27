// TC-APP-01: Kanban card for a pipeline lead.
// Shows title, next action, and last activity per the contract.
// Terminal transitions (Won/Lost/Disqualified) are not columns, so the card
// exposes them as actions.

import { LEGAL_TRANSITIONS, type LeadStage } from "./transitions";

export interface PipelineLead {
	id: string;
	identifier: string;
	title: string | null;
	stage: LeadStage;
	updatedAt: number;
	lastHandledBy: string | null;
}

function relativeTime(timestamp: number): string {
	const elapsed = Date.now() - timestamp;
	const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		["day", 86_400_000],
		["hour", 3_600_000],
		["minute", 60_000],
	];
	for (const [unit, ms] of units) {
		if (Math.abs(elapsed) >= ms) {
			return formatter.format(-Math.round(elapsed / ms), unit);
		}
	}
	return "just now";
}

export function nextActionFor(stage: LeadStage): string {
	const next = LEGAL_TRANSITIONS[stage]?.[0];
	if (!next) return "Closed";
	if (next === "Disqualified" || next === "Lost" || next === "Won")
		return `Move to ${next.toLowerCase()}`;
	return next;
}

const TERMINAL_TARGETS: LeadStage[] = ["Won", "Lost", "Disqualified"];

export function LeadCard({
	lead,
	onTerminalMove,
}: {
	lead: PipelineLead;
	onTerminalMove?: (lead: PipelineLead, to: LeadStage) => void;
}) {
	const terminalOptions = (LEGAL_TRANSITIONS[lead.stage] ?? []).filter((s) =>
		(TERMINAL_TARGETS as string[]).includes(s),
	);
	return (
		<div className="rounded-md border border-border bg-card p-3 shadow-sm">
			<div className="font-medium text-sm leading-tight">
				{lead.title || lead.identifier}
			</div>
			<div className="mt-2 space-y-1 text-muted-foreground text-xs">
				<div>
					<span className="font-medium text-foreground/70">Next:</span>{" "}
					{nextActionFor(lead.stage)}
				</div>
				<div>
					{relativeTime(lead.updatedAt)}
					{lead.lastHandledBy ? ` by ${lead.lastHandledBy}` : ""}
				</div>
			</div>
			{onTerminalMove && terminalOptions.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1 border-border border-t pt-2">
					{terminalOptions.map((target) => (
						<button
							key={target}
							type="button"
							onClick={() => onTerminalMove(lead, target)}
							className="rounded border border-input px-2 py-0.5 text-xs hover:bg-muted"
						>
							Mark {target}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
