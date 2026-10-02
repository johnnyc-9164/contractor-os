// TC-APP-01: Kanban card for a pipeline lead.
// Shows title, next action, and last activity per the contract.
// Terminal transitions (Won/Lost/Disqualified) are not columns, so the card
// exposes them as actions.

import { Avatar, AvatarFallback } from "@contractor-os/ui/components/avatar";
import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import { ArrowRightIcon } from "lucide-react";
import { leadInitials } from "@/lib/lead-initials";
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
	isPrincipal,
	onSelect,
	onTerminalMove,
}: {
	lead: PipelineLead;
	isPrincipal: boolean;
	onSelect?: (lead: PipelineLead) => void;
	onTerminalMove?: (lead: PipelineLead, to: LeadStage) => void;
}) {
	const terminalOptions = (LEGAL_TRANSITIONS[lead.stage] ?? []).filter(
		(stage) => (TERMINAL_TARGETS as string[]).includes(stage),
	);
	const title = lead.title || lead.identifier;

	return (
		<Card
			size="sm"
			className="transition-colors focus-within:ring-foreground/30 hover:ring-foreground/20"
		>
			<CardHeader>
				<div className="flex min-w-0 items-start gap-2">
					<Avatar aria-hidden="true" size="sm">
						<AvatarFallback>
							{leadInitials(lead.title, lead.identifier)}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<CardTitle>
							{onSelect ? (
								<button
									type="button"
									onClick={() => onSelect(lead)}
									className="w-full text-left outline-none focus-visible:underline focus-visible:underline-offset-4"
									aria-label={`Open lead details for ${title}`}
								>
									{title}
								</button>
							) : (
								title
							)}
						</CardTitle>
						<CardDescription className="mt-1 break-all font-mono">
							{lead.identifier}
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<dl className="flex flex-col gap-1 text-xs">
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground">Next</dt>
						<dd className="text-right font-medium">
							{nextActionFor(lead.stage)}
						</dd>
					</div>
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground">Activity</dt>
						<dd className="text-right">
							{relativeTime(lead.updatedAt)}
							{lead.lastHandledBy ? ` by ${lead.lastHandledBy}` : ""}
						</dd>
					</div>
				</dl>
			</CardContent>

			{onTerminalMove && terminalOptions.length > 0 ? (
				<CardFooter className="flex-wrap gap-1">
					{terminalOptions.map((target) => {
						const requiresPrincipal =
							(target === "Awarded" || target === "Won") && !isPrincipal;
						return (
							<Button
								key={target}
								type="button"
								variant="ghost"
								size="xs"
								disabled={requiresPrincipal}
								title={
									requiresPrincipal
										? `Moving to ${target} requires principal authority`
										: undefined
								}
								onClick={() => onTerminalMove(lead, target)}
							>
								Mark {target}
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
						);
					})}
				</CardFooter>
			) : null}
		</Card>
	);
}
