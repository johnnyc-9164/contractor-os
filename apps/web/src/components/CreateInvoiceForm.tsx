"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { submitInvoiceDraft } from "./invoice-submission";

export function CreateInvoiceForm({ onCreated }: { onCreated?: () => void }) {
	const createInvoice = useMutation(api.backend.co_create_invoice);
	const [job, setJob] = useState("");
	const [client, setClient] = useState("");
	const [invoiceNumber, setInvoiceNumber] = useState("");
	const [invoiceType, setInvoiceType] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [amountError, setAmountError] = useState<string | null>(null);
	const [dueDateError, setDueDateError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		setAmountError(null);
		setDueDateError(null);
		try {
			const result = await submitInvoiceDraft(
				{
					job,
					client,
					invoiceNumber,
					invoiceType,
					amount,
					dueDate,
				},
				createInvoice,
			);
			if (!result.ok) {
				if (result.field === "amount") setAmountError(result.error);
				else if (result.field === "dueDate") setDueDateError(result.error);
				else setError(result.error);
				return;
			}
			setJob("");
			setClient("");
			setInvoiceNumber("");
			setInvoiceType("");
			setAmount("");
			setDueDate("");
			onCreated?.();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create invoice.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const inputStyle = {
		padding: "0.5rem",
		borderRadius: "4px",
		border: "1px solid #ccc",
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
		>
			<h3>Create Invoice</h3>
			<input
				type="text"
				placeholder="Job (required)"
				value={job}
				onChange={(e) => setJob(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Client (required)"
				value={client}
				onChange={(e) => setClient(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Invoice Number (required)"
				value={invoiceNumber}
				onChange={(e) => setInvoiceNumber(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Invoice Type (required)"
				value={invoiceType}
				onChange={(e) => setInvoiceType(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<label htmlFor="invoice-due-date">Due date (required)</label>
			<input
				id="invoice-due-date"
				type="date"
				value={dueDate}
				onChange={(e) => {
					setDueDate(e.target.value);
					setDueDateError(null);
				}}
				required
				disabled={submitting}
				style={inputStyle}
				aria-invalid={dueDateError ? true : undefined}
				aria-describedby={dueDateError ? "invoice-due-date-error" : undefined}
			/>
			{dueDateError && (
				<p
					id="invoice-due-date-error"
					role="alert"
					style={{ color: "red", fontSize: "0.875rem" }}
				>
					{dueDateError}
				</p>
			)}
			<input
				type="text"
				inputMode="decimal"
				placeholder="Amount (required)"
				value={amount}
				onChange={(e) => {
					setAmount(e.target.value);
					setAmountError(null);
				}}
				disabled={submitting}
				style={inputStyle}
				aria-invalid={amountError ? true : undefined}
				aria-describedby={amountError ? "invoice-amount-error" : undefined}
			/>
			{amountError && (
				<p
					id="invoice-amount-error"
					role="alert"
					style={{ color: "red", fontSize: "0.875rem" }}
				>
					{amountError}
				</p>
			)}
			{error && (
				<div style={{ color: "red", fontSize: "0.875rem" }}>{error}</div>
			)}
			<button
				type="submit"
				disabled={submitting}
				style={{
					padding: "0.5rem 1rem",
					borderRadius: "4px",
					border: "none",
					backgroundColor: submitting ? "#ccc" : "#0070f3",
					color: "white",
					cursor: submitting ? "not-allowed" : "pointer",
				}}
			>
				{submitting ? "Creating..." : "Create Invoice"}
			</button>
		</form>
	);
}
