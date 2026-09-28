import type { api } from "@contractor-os/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";
import { parseInvoiceAmount } from "../lib/invoice-amount";

type CreateInvoiceArgs = FunctionArgs<typeof api.backend.co_create_invoice>;
export type InvoiceDraft = {
	job: string;
	client: string;
	invoiceNumber: string;
	invoiceType: string;
	amount: string;
	dueDate: string;
};

export async function submitInvoiceDraft(
	draft: InvoiceDraft,
	createInvoice: (args: CreateInvoiceArgs) => Promise<unknown>,
): Promise<
	| { ok: true }
	| { ok: false; field: "amount" | "dueDate" | "form"; error: string }
> {
	if (
		!draft.job.trim() ||
		!draft.client.trim() ||
		!draft.invoiceNumber.trim() ||
		!draft.invoiceType.trim()
	)
		return {
			ok: false,
			field: "form",
			error: "Job, Client, Invoice Number, and Invoice Type are required.",
		};
	const amount = parseInvoiceAmount(draft.amount);
	if (amount === null)
		return {
			ok: false,
			field: "amount",
			error:
				"Enter an amount greater than zero in dollars, with up to two decimal places.",
		};
	const dueDate = draft.dueDate.trim();
	const dueDateUtc = new Date(`${dueDate}T00:00:00.000Z`);
	if (
		!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dueDate) ||
		Number.isNaN(dueDateUtc.getTime()) ||
		dueDateUtc.toISOString().slice(0, 10) !== dueDate
	)
		return {
			ok: false,
			field: "dueDate",
			error: "Enter a valid due date.",
		};
	await createInvoice({
		requestKey: `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		input: {
			job: draft.job.trim(),
			client: draft.client.trim(),
			invoice_number: draft.invoiceNumber.trim(),
			invoice_type: draft.invoiceType.trim(),
			amount,
			due_date: dueDateUtc.toISOString(),
		},
	});
	return { ok: true };
}
