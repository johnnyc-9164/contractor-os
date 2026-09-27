// TC-APP-01: Field dialog opened on drop when the op needs more than lead_id.
// Collects the contract's required fields, then confirms the dispatch.

"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";
import {
	type DialogField,
	FIELD_LABELS,
	OUTREACH_CHANNELS,
	TERMINAL_REASONS,
} from "./transitions";

export interface PendingTransition {
	// Dispatch identifier: the component co_lead `identifier` form (what
	// findLead's by_co_lead_id bridge resolves), NOT the board's card id.
	leadId: string;
	leadTitle: string;
	from: string;
	to: string;
	contract: string;
	fields: DialogField[];
}

function dollarsToCents(input: string): number | null {
	const n = Number.parseFloat(input);
	if (Number.isNaN(n) || n <= 0) return null;
	return Math.round(n * 100);
}

export function TransitionDialog({
	pending,
	onConfirm,
	onCancel,
}: {
	pending: PendingTransition | null;
	onConfirm: (payload: Record<string, unknown>) => void;
	onCancel: () => void;
}) {
	const [values, setValues] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);

	if (!pending) return null;

	const set = (field: string, value: string) => {
		setValues((v) => ({ ...v, [field]: value }));
		setError(null);
	};

	const handleConfirm = () => {
		const payload: Record<string, unknown> = { lead_id: pending.leadId };
		for (const field of pending.fields) {
			const raw = (values[field] ?? "").trim();
			switch (field) {
				case "channel":
					if (!raw) return setError("Channel is required.");
					payload.channel = raw;
					break;
				case "message_ref":
					if (raw) payload.message_ref = raw;
					break;
				case "reply_summary":
					if (!raw) return setError("Reply summary is required.");
					payload.reply_summary = raw;
					break;
				case "client_name":
					if (!raw) return setError("Client name is required.");
					payload.client_name = raw;
					break;
				case "client_type":
					if (raw) payload.client_type = raw;
					break;
				case "qualification_notes":
					if (raw) payload.qualification_notes = raw;
					break;
				case "scheduled_at":
					if (!raw) return setError("Scheduled date and time is required.");
					payload.scheduled_at = new Date(raw).toISOString();
					break;
				case "address":
					if (raw) payload.address = raw;
					break;
				case "visit_notes":
					if (raw) payload.notes = raw;
					break;
				case "amount_cents": {
					const cents = dollarsToCents(raw);
					if (cents === null)
						return setError("Enter a proposal amount greater than zero.");
					payload.amount_cents = cents;
					break;
				}
				case "proposal_doc_ref":
					if (raw) payload.proposal_doc_ref = raw;
					break;
				case "bid_amount_cents": {
					const cents = dollarsToCents(raw);
					if (cents === null)
						return setError("Enter a bid amount greater than zero.");
					payload.bid_amount_cents = cents;
					break;
				}
				case "hold_reason":
					if (!raw) return setError("Hold reason is required.");
					payload.reason = raw;
					break;
				case "terminal_reason":
					if (!raw) return setError("A reason is required.");
					payload.reason = raw;
					break;
				case "reason_text":
					if (raw) payload.reason_text = raw;
					break;
				case "reopen_reason":
					if (!raw) return setError("Re-open reason is required.");
					payload.reason = raw;
					break;
			}
		}
		onConfirm(payload);
	};

	const renderField = (field: DialogField) => {
		const label = FIELD_LABELS[field];
		const value = values[field] ?? "";
		const id = `transition-${field}`;
		const labelEl = (
			<span className="mb-1 block font-medium text-sm">
				<label htmlFor={id}>{label}</label>
			</span>
		);
		const inputClass =
			"w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
		if (field === "channel") {
			return (
				<div key={field}>
					{labelEl}
					<select
						id={id}
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					>
						<option value="">Select channel</option>
						{OUTREACH_CHANNELS.map((c) => (
							<option key={c} value={c}>
								{c.replace("_", " ")}
							</option>
						))}
					</select>
				</div>
			);
		}
		if (field === "terminal_reason") {
			return (
				<div key={field}>
					{labelEl}
					<select
						id={id}
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					>
						<option value="">Select reason</option>
						{TERMINAL_REASONS.map((r) => (
							<option key={r} value={r}>
								{r.replace("_", " ")}
							</option>
						))}
					</select>
				</div>
			);
		}
		if (field === "scheduled_at") {
			return (
				<div key={field}>
					{labelEl}
					<input
						id={id}
						type="datetime-local"
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					/>
				</div>
			);
		}
		if (field === "amount_cents" || field === "bid_amount_cents") {
			return (
				<div key={field}>
					{labelEl}
					<input
						id={id}
						type="number"
						min="0"
						step="0.01"
						inputMode="decimal"
						placeholder="0.00"
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					/>
				</div>
			);
		}
		const multiline =
			field === "reply_summary" ||
			field === "qualification_notes" ||
			field === "visit_notes" ||
			field === "reason_text" ||
			field === "hold_reason" ||
			field === "reopen_reason";
		return (
			<div key={field}>
				{labelEl}
				{multiline ? (
					<textarea
						id={id}
						rows={3}
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					/>
				) : (
					<input
						id={id}
						type="text"
						value={value}
						onChange={(e) => set(field, e.target.value)}
						className={inputClass}
					/>
				)}
			</div>
		);
	};

	return (
		<Dialog.Root
			open={true}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
					<Dialog.Title className="font-semibold text-lg">
						Move to {pending.to}
					</Dialog.Title>
					<Dialog.Description className="mt-1 text-muted-foreground text-sm">
						{pending.leadTitle} — {pending.from} to {pending.to}. Fill in the
						required details to complete the move.
					</Dialog.Description>
					<div className="mt-4 space-y-3">
						{pending.fields.map(renderField)}
					</div>
					{error && (
						<p className="mt-3 text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={onCancel}
							className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
						>
							Confirm move
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
