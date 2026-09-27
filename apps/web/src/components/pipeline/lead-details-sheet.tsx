import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@contractor-os/ui/components/sheet";
import { ArrowRightIcon, DatabaseIcon } from "lucide-react";
import type { PipelineLead } from "./lead-card";
import { LEGAL_TRANSITIONS, type LeadStage } from "./transitions";

function formatUpdatedAt(timestamp: number): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(timestamp);
}

export function LeadDetailsSheet({
	lead,
	isPrincipal,
	onOpenChange,
	onTransition,
}: {
	lead: PipelineLead | null;
	isPrincipal: boolean;
	onOpenChange: (open: boolean) => void;
	onTransition: (lead: PipelineLead, to: LeadStage) => void;
}) {
	const transitions = lead ? LEGAL_TRANSITIONS[lead.stage] : [];

	return (
		<Sheet open={Boolean(lead)} onOpenChange={onOpenChange}>
			<SheetContent className="w-full gap-0 sm:max-w-xl">
				{lead ? (
					<>
						<SheetHeader className="border-b pb-5">
							<SheetTitle>{lead.title || lead.identifier}</SheetTitle>
							<SheetDescription>
								{lead.stage} lead · {lead.identifier}
							</SheetDescription>
						</SheetHeader>

						<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
							<section aria-labelledby="lead-record-heading">
								<h3
									id="lead-record-heading"
									className="mb-3 font-medium text-sm"
								>
									Lead record
								</h3>
								<dl className="grid gap-3 text-sm sm:grid-cols-2">
									<div className="flex flex-col gap-1 border p-3">
										<dt className="text-muted-foreground text-xs">Stage</dt>
										<dd className="font-medium">{lead.stage}</dd>
									</div>
									<div className="flex flex-col gap-1 border p-3">
										<dt className="text-muted-foreground text-xs">Updated</dt>
										<dd className="font-medium">
											{formatUpdatedAt(lead.updatedAt)}
										</dd>
									</div>
									<div className="flex flex-col gap-1 border p-3 sm:col-span-2">
										<dt className="text-muted-foreground text-xs">
											Record identifier
										</dt>
										<dd className="break-all font-mono text-xs">
											{lead.identifier}
										</dd>
									</div>
									{lead.lastHandledBy ? (
										<div className="flex flex-col gap-1 border p-3 sm:col-span-2">
											<dt className="text-muted-foreground text-xs">
												Last handled by
											</dt>
											<dd className="break-all font-medium">
												{lead.lastHandledBy}
											</dd>
										</div>
									) : null}
								</dl>
							</section>

							<Card size="sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<DatabaseIcon aria-hidden="true" />
										Lead context
									</CardTitle>
									<CardDescription>
										Only information saved on this lead appears here.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground text-xs/relaxed">
										Contact details, source, conversation history, and quote
										context are not available on this record yet.
									</p>
								</CardContent>
							</Card>

							<section aria-labelledby="lead-actions-heading">
								<h3
									id="lead-actions-heading"
									className="mb-3 font-medium text-sm"
								>
									Next stage
								</h3>
								{transitions.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{transitions.map((target) => {
											const requiresPrincipal =
												target === "Awarded" && !isPrincipal;
											return (
												<Button
													key={target}
													type="button"
													variant={
														target === "Lost" || target === "Disqualified"
															? "destructive"
															: "outline"
													}
													disabled={requiresPrincipal}
													title={
														requiresPrincipal
															? "Awarding requires principal authority"
															: undefined
													}
													onClick={() => onTransition(lead, target)}
												>
													Move to {target}
													<ArrowRightIcon data-icon="inline-end" />
												</Button>
											);
										})}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										This lead has reached the end of its workflow.
									</p>
								)}
							</section>
						</div>
					</>
				) : (
					<SheetHeader>
						<SheetTitle>Lead details</SheetTitle>
						<SheetDescription>
							Select a lead to view its record.
						</SheetDescription>
					</SheetHeader>
				)}
			</SheetContent>
		</Sheet>
	);
}
