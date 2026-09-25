"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import { Input } from "@contractor-os/ui/components/input";
import { Label } from "@contractor-os/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@contractor-os/ui/components/sheet";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { displayStage } from "../../app/(app)/leads/lead-stages";

type Lead = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	revision: number;
	updatedAt: number;
};

type TimelineEvent = {
	key: string;
	at: string;
	action: string;
	actor_display: string;
	from_state: string | null;
	to_state: string | null;
	reason: string | null;
};

type ActionField = {
	name: string;
	label: string;
	type: "text" | "select" | "number" | "datetime";
	required: boolean;
	options?: string[];
};

type LeadAction = {
	op: string;
	label: string;
	fields: ActionField[];
};

// Maps display stage -> legal actions with their required fields.
// Derived from catalog.ts op guards + schemas (TC-BUILD-4).
const ACTIONS_BY_STAGE: Record<string, LeadAction[]> = {
	Prospect: [
		{
			op: "lead.sendOutreach",
			label: "Send outreach",
			fields: [
				{
					name: "channel",
					label: "Channel",
					type: "select",
					required: true,
					options: ["call", "sms", "email", "in_person"],
				},
			],
		},
		{
			op: "lead.disqualify",
			label: "Disqualify",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Outreach Sent": [
		{
			op: "lead.recordReply",
			label: "Record reply",
			fields: [
				{
					name: "reply_summary",
					label: "Reply summary",
					type: "text",
					required: true,
				},
			],
		},
		{
			op: "lead.disqualify",
			label: "Disqualify",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Reply Received": [
		{
			op: "lead.qualify",
			label: "Qualify",
			fields: [
				{
					name: "client_name",
					label: "Client name",
					type: "text",
					required: true,
				},
			],
		},
		{
			op: "lead.disqualify",
			label: "Disqualify",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	Qualifying: [
		{
			op: "lead.scheduleSiteVisit",
			label: "Schedule site visit",
			fields: [
				{
					name: "scheduled_at",
					label: "Scheduled date/time",
					type: "datetime",
					required: true,
				},
			],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.disqualify",
			label: "Disqualify",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Site Visit Scheduled": [
		{
			op: "lead.startScope",
			label: "Start scope",
			fields: [],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Scope In Progress": [
		{
			op: "lead.sendProposal",
			label: "Send proposal",
			fields: [
				{
					name: "amount_cents",
					label: "Amount (USD)",
					type: "number",
					required: true,
				},
			],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Proposal Sent": [
		{
			op: "lead.submitBid",
			label: "Submit bid",
			fields: [
				{
					name: "bid_amount_cents",
					label: "Bid amount (USD)",
					type: "number",
					required: true,
				},
			],
		},
		{
			op: "lead.award",
			label: "Award",
			fields: [],
		},
		{
			op: "lead.win",
			label: "Mark won",
			fields: [],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"Bid Submitted": [
		{
			op: "lead.award",
			label: "Award",
			fields: [],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	Awarded: [
		{
			op: "lead.win",
			label: "Mark won",
			fields: [],
		},
		{
			op: "lead.hold",
			label: "Put on hold",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	"On Hold": [
		{
			op: "lead.resume",
			label: "Resume",
			fields: [],
		},
		{
			op: "lead.lose",
			label: "Mark lost",
			fields: [
				{
					name: "reason",
					label: "Reason",
					type: "select",
					required: true,
					options: ["no_show", "price", "timing", "fit", "duplicate", "other"],
				},
				{
					name: "reason_text",
					label: "Details (optional)",
					type: "text",
					required: false,
				},
			],
		},
	],
	Disqualified: [
		{
			op: "lead.reopen",
			label: "Re-open",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
	],
	Lost: [
		{
			op: "lead.reopen",
			label: "Re-open",
			fields: [
				{ name: "reason", label: "Reason", type: "text", required: true },
			],
		},
	],
	Won: [],
};

// Semantic stage colors (not brand-blue everywhere).
const STAGE_STYLES: Record<string, string> = {
	Prospect: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
	"Outreach Sent":
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
	"Reply Received":
		"bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
	Qualifying:
		"bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
	"Site Visit Scheduled":
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
	"Scope In Progress":
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	"Proposal Sent":
		"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	"Bid Submitted":
		"bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
	Awarded:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
	Won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	"On Hold":
		"bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
	Disqualified: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
	Lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function stagePillClass(stage: string): string {
	return STAGE_STYLES[stage] ?? "bg-secondary text-secondary-foreground";
}

function ActionForm({
	action,
	leadId,
	onDone,
}: {
	action: LeadAction;
	leadId: string;
	onDone: () => void;
}) {
	const dispatch = useMutation(api.catalog.dispatch);
	const [values, setValues] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		// Client-side required-field check.
		for (const field of action.fields) {
			if (field.required && !values[field.name]?.trim()) {
				setError(`${field.label} is required.`);
				return;
			}
		}

		const payload: Record<string, unknown> = { lead_id: leadId };
		for (const field of action.fields) {
			const raw = values[field.name];
			if (raw === undefined || raw === "") continue;
			if (field.name === "amount_cents" || field.name === "bid_amount_cents") {
				const dollars = Number.parseFloat(raw);
				if (Number.isNaN(dollars) || dollars <= 0) {
					setError(`${field.label} must be a positive number.`);
					return;
				}
				payload[field.name] = Math.round(dollars * 100);
			} else {
				payload[field.name] = raw;
			}
		}

		setSubmitting(true);
		try {
			const envelope = await dispatch({
				contract: action.op,
				schema_version: 1,
				idempotency_key: crypto.randomUUID(),
				payload,
			});
			if (!envelope.ok) {
				const detail =
					(envelope as { error?: { detail?: unknown } }).error?.detail ??
					"Action was blocked.";
				setError(typeof detail === "string" ? detail : JSON.stringify(detail));
				return;
			}
			onDone();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Dispatch failed.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form
			className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
			onSubmit={handleSubmit}
		>
			<p className="font-medium text-sm">{action.label}</p>
			{action.fields.map((field) => (
				<div className="space-y-1.5" key={field.name}>
					<Label htmlFor={`field-${field.name}`}>
						{field.label}
						{field.required ? " *" : ""}
					</Label>
					{field.type === "select" ? (
						<select
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							id={`field-${field.name}`}
							onChange={(e) =>
								setValues((v) => ({ ...v, [field.name]: e.target.value }))
							}
							value={values[field.name] ?? ""}
						>
							<option value="">Select…</option>
							{field.options?.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					) : (
						<Input
							id={`field-${field.name}`}
							onChange={(e) =>
								setValues((v) => ({ ...v, [field.name]: e.target.value }))
							}
							type={
								field.type === "number"
									? "number"
									: field.type === "datetime"
										? "datetime-local"
										: "text"
							}
							value={values[field.name] ?? ""}
						/>
					)}
				</div>
			))}
			{error ? (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}
			<div className="flex gap-2">
				<Button disabled={submitting} size="sm" type="submit">
					{submitting ? "Working…" : "Confirm"}
				</Button>
				<Button onClick={onDone} size="sm" type="button" variant="outline">
					Cancel
				</Button>
			</div>
		</form>
	);
}

export function LeadDrawer({
	lead,
	open,
	onOpenChange,
	onLeadUpdated,
}: {
	lead: Lead | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onLeadUpdated: () => void;
}) {
	const [activeAction, setActiveAction] = useState<LeadAction | null>(null);
	const timeline = useQuery(
		api.events.timelineForLead,
		lead ? { lead_key: lead.identifier } : "skip",
	);

	const stage = lead ? displayStage(lead.state) : "";
	const actions = lead ? (ACTIONS_BY_STAGE[stage] ?? []) : [];
	const latestEvent = (timeline as TimelineEvent[] | undefined)?.[0];

	return (
		<Sheet
			onOpenChange={(isOpen) => {
				if (!isOpen) setActiveAction(null);
				onOpenChange(isOpen);
			}}
			open={open}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
				{lead ? (
					<>
						<SheetHeader>
							<SheetTitle>{lead.title || lead.identifier}</SheetTitle>
							<SheetDescription className="font-mono text-xs">
								{lead.identifier}
							</SheetDescription>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span
									className={`inline-flex rounded-full px-2.5 py-1 font-medium text-xs ${stagePillClass(stage)}`}
								>
									{stage}
								</span>
								{latestEvent ? (
									<span className="text-muted-foreground text-xs">
										Last activity: {latestEvent.actor_display} ·{" "}
										{new Date(latestEvent.at).toLocaleDateString()}
									</span>
								) : null}
							</div>
						</SheetHeader>

						<div className="space-y-6 px-6 py-4">
							{/* Record summary — computed from the record, not AI. */}
							<section>
								<h3 className="mb-2 font-medium text-sm">Record summary</h3>
								<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
									<dt className="text-muted-foreground">Stage</dt>
									<dd>{stage}</dd>
									<dt className="text-muted-foreground">Revision</dt>
									<dd className="tabular-nums">{lead.revision}</dd>
									<dt className="text-muted-foreground">Updated</dt>
									<dd>
										{new Date(lead.updatedAt).toLocaleDateString()}{" "}
										{new Date(lead.updatedAt).toLocaleTimeString()}
									</dd>
									{latestEvent?.actor_display ? (
										<>
											<dt className="text-muted-foreground">Last handled by</dt>
											<dd>{latestEvent.actor_display}</dd>
										</>
									) : null}
								</dl>
							</section>

							{/* Event timeline */}
							<section>
								<h3 className="mb-2 font-medium text-sm">Timeline</h3>
								{timeline === undefined ? (
									<p className="text-muted-foreground text-sm">Loading…</p>
								) : (timeline as TimelineEvent[]).length === 0 ? (
									<p className="text-muted-foreground text-sm">
										No events yet for this lead.
									</p>
								) : (
									<ol className="space-y-3">
										{(timeline as TimelineEvent[]).map((event) => (
											<li
												className="border-border border-l-2 pl-3 text-sm"
												key={event.key}
											>
												<p className="font-medium">{event.action}</p>
												<p className="text-muted-foreground text-xs">
													{event.actor_display} ·{" "}
													{new Date(event.at).toLocaleString()}
												</p>
												{event.from_state || event.to_state ? (
													<p className="text-muted-foreground text-xs">
														{event.from_state ?? "—"} → {event.to_state ?? "—"}
													</p>
												) : null}
												{event.reason ? (
													<p className="text-muted-foreground text-xs">
														Reason: {event.reason}
													</p>
												) : null}
											</li>
										))}
									</ol>
								)}
							</section>

							{/* Action row — only legal transitions. */}
							<section>
								<h3 className="mb-2 font-medium text-sm">Actions</h3>
								{actions.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										No actions available in this stage.
									</p>
								) : activeAction ? (
									<ActionForm
										action={activeAction}
										leadId={lead.identifier}
										onDone={() => {
											setActiveAction(null);
											onLeadUpdated();
										}}
									/>
								) : (
									<div className="flex flex-wrap gap-2">
										{actions.map((action) => (
											<Button
												key={action.op}
												onClick={() => {
													if (action.fields.length === 0) {
														// No fields: dispatch immediately.
														setActiveAction(action);
													} else {
														setActiveAction(action);
													}
												}}
												size="sm"
												variant="outline"
											>
												{action.label}
											</Button>
										))}
									</div>
								)}
							</section>
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
