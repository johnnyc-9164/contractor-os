"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function CreateInvoiceForm({ onCreated }: { onCreated?: () => void }) {
	const createInvoice = useMutation(api.backend.co_create_invoice);
	const [job, setJob] = useState("");
	const [client, setClient] = useState("");
	const [invoiceNumber, setInvoiceNumber] = useState("");
	const [invoiceType, setInvoiceType] = useState("");
	const [amount, setAmount] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!job.trim() ||
			!client.trim() ||
			!invoiceNumber.trim() ||
			!invoiceType.trim() ||
			!amount.trim()
		) {
			setError(
				"Job, Client, Invoice Number, Invoice Type, and Amount are required.",
			);
			return;
		}
		const amountNum = Number.parseFloat(amount);
		if (isNaN(amountNum) || amountNum <= 0) {
			setError("Amount must be a positive number.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await createInvoice({
				requestKey: `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				input: {
					job: job.trim(),
					client: client.trim(),
					invoice_number: invoiceNumber.trim(),
					invoice_type: invoiceType.trim(),
					amount: amountNum,
				},
			});
			setJob("");
			setClient("");
			setInvoiceNumber("");
			setInvoiceType("");
			setAmount("");
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
			<input
				type="number"
				placeholder="Amount (required)"
				value={amount}
				onChange={(e) => setAmount(e.target.value)}
				disabled={submitting}
				style={inputStyle}
				min="0"
				step="0.01"
			/>
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
