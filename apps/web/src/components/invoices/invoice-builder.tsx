"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import { Card } from "@contractor-os/ui/components/card";
import { Input } from "@contractor-os/ui/components/input";
import { Label } from "@contractor-os/ui/components/label";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { ZodError } from "zod";
import {
	computeTotals,
	formatCents,
	INVOICE_TYPES,
	type InvoiceType,
	invoiceFormSchema,
	type LineItem,
} from "./invoice-schema";
import { LineItemsTable } from "./line-items-table";

type InvoiceBuilderProps = {
	leadId?: string;
};

type SubmitState =
	| { status: "idle" }
	| { status: "submitting" }
	| { status: "success"; reference: string }
	| { status: "error"; message: string };

function flattenZodErrors(error: ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.map(String).join(".");
		if (!(key in out)) out[key] = issue.message;
	}
	return out;
}

export function InvoiceBuilder({ leadId }: InvoiceBuilderProps) {
	const createInvoice = useMutation(api.backend.co_create_invoice);
	const lead = useQuery(
		api.backend.inspectRecord,
		leadId ? { blueprint: "co_lead", identifier: leadId } : "skip",
	);

	const [client, setClient] = useState("");
	const [job, setJob] = useState("");
	const [invoiceNumber, setInvoiceNumber] = useState("");
	const [invoiceType, setInvoiceType] = useState<InvoiceType>("progress");
	const [dueDate, setDueDate] = useState("");
	const [taxRate, setTaxRate] = useState<number>(0);
	const [items, setItems] = useState<LineItem[]>([
		{ description: "", quantity: 1, unitPrice: 0 },
	]);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitState, setSubmitState] = useState<SubmitState>({
		status: "idle",
	});

	useEffect(() => {
		if (lead && typeof lead === "object" && "title" in lead) {
			const title = (lead as { title?: string | null }).title;
			if (title) setClient(title);
		}
	}, [lead]);

	const totals = useMemo(() => computeTotals(items, taxRate), [items, taxRate]);

	const disabled =
		submitState.status === "submitting" || submitState.status === "success";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (disabled) return;

		const parsed = invoiceFormSchema.safeParse({
			client,
			job,
			invoiceNumber,
			invoiceType,
			dueDate,
			taxRate,
			items,
		});
		if (!parsed.success) {
			setFieldErrors(flattenZodErrors(parsed.error));
			setSubmitState({ status: "idle" });
			return;
		}
		setFieldErrors({});
		setSubmitState({ status: "submitting" });

		try {
			const result = await createInvoice({
				requestKey: `invoice-${crypto.randomUUID()}`,
				input: {
					job: parsed.data.job,
					amount: totals.totalCents / 100,
					client: parsed.data.client,
					due_date: parsed.data.dueDate,
					invoice_type: parsed.data.invoiceType,
					invoice_number: parsed.data.invoiceNumber,
				},
			});
			setSubmitState({
				status: "success",
				reference: result.primary.identifier,
			});
		} catch (err) {
			setSubmitState({
				status: "error",
				message:
					err instanceof Error ? err.message : "Failed to create invoice.",
			});
		}
	};

	const parseTaxRate = (value: string): number => {
		const parsed = Number.parseFloat(value);
		return Number.isNaN(parsed) ? Number.NaN : parsed;
	};

	if (submitState.status === "success") {
		return (
			<Card className="p-6">
				<h2 className="font-semibold text-lg">Invoice created</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					Reference:{" "}
					<span className="font-medium font-mono text-foreground">
						{submitState.reference}
					</span>
				</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Total: {formatCents(totals.totalCents)}
				</p>
			</Card>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card className="space-y-4 p-6">
				<h2 className="font-semibold text-lg">Bill to</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="client">Client</Label>
						<Input
							id="client"
							value={client}
							onChange={(e) => setClient(e.target.value)}
							placeholder="Client name"
							disabled={disabled}
							aria-invalid={!!fieldErrors.client}
						/>
						{fieldErrors.client && (
							<p className="text-destructive text-xs">{fieldErrors.client}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="job">Job</Label>
						<Input
							id="job"
							value={job}
							onChange={(e) => setJob(e.target.value)}
							placeholder="Job reference or description"
							disabled={disabled}
							aria-invalid={!!fieldErrors.job}
						/>
						{fieldErrors.job && (
							<p className="text-destructive text-xs">{fieldErrors.job}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="invoice-number">Invoice number</Label>
						<Input
							id="invoice-number"
							value={invoiceNumber}
							onChange={(e) => setInvoiceNumber(e.target.value)}
							placeholder="INV-0001"
							disabled={disabled}
							aria-invalid={!!fieldErrors.invoiceNumber}
						/>
						{fieldErrors.invoiceNumber && (
							<p className="text-destructive text-xs">
								{fieldErrors.invoiceNumber}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="invoice-type">Invoice type</Label>
						<select
							id="invoice-type"
							value={invoiceType}
							onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
							disabled={disabled}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
							aria-invalid={!!fieldErrors.invoiceType}
						>
							{INVOICE_TYPES.map((t) => (
								<option key={t.value} value={t.value}>
									{t.label}
								</option>
							))}
						</select>
						{fieldErrors.invoiceType && (
							<p className="text-destructive text-xs">
								{fieldErrors.invoiceType}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="due-date">Due date</Label>
						<Input
							id="due-date"
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							disabled={disabled}
							aria-invalid={!!fieldErrors.dueDate}
						/>
						{fieldErrors.dueDate && (
							<p className="text-destructive text-xs">{fieldErrors.dueDate}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="tax-rate">Tax rate (%)</Label>
						<Input
							id="tax-rate"
							type="number"
							min="0"
							max="100"
							step="0.01"
							value={Number.isNaN(taxRate) ? "" : taxRate}
							onChange={(e) => setTaxRate(parseTaxRate(e.target.value))}
							disabled={disabled}
							aria-invalid={!!fieldErrors.taxRate}
						/>
						{fieldErrors.taxRate && (
							<p className="text-destructive text-xs">{fieldErrors.taxRate}</p>
						)}
					</div>
				</div>
			</Card>

			<Card className="space-y-4 p-6">
				<h2 className="font-semibold text-lg">Line items</h2>
				<LineItemsTable
					items={items}
					disabled={disabled}
					onChange={setItems}
					fieldErrors={fieldErrors}
				/>
			</Card>

			<Card className="p-6">
				<dl className="space-y-1 text-sm">
					<div className="flex justify-between">
						<dt className="text-muted-foreground">Subtotal</dt>
						<dd className="tabular-nums">
							{formatCents(totals.subtotalCents)}
						</dd>
					</div>
					<div className="flex justify-between">
						<dt className="text-muted-foreground">
							Tax ({Number.isNaN(taxRate) ? 0 : taxRate}%)
						</dt>
						<dd className="tabular-nums">{formatCents(totals.taxCents)}</dd>
					</div>
					<div className="flex justify-between border-t pt-2 font-semibold text-base">
						<dt>Total</dt>
						<dd className="tabular-nums">{formatCents(totals.totalCents)}</dd>
					</div>
				</dl>
			</Card>

			{submitState.status === "error" && (
				<p role="alert" className="text-destructive text-sm">
					{submitState.message}
				</p>
			)}

			<Button type="submit" disabled={disabled} className="w-full sm:w-auto">
				{submitState.status === "submitting"
					? "Creating invoice..."
					: "Create invoice"}
			</Button>
		</form>
	);
}
