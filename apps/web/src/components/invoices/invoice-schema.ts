import { z } from "zod";

export const lineItemSchema = z.object({
	description: z.string().trim().min(1, "Description is required."),
	quantity: z
		.number({ error: "Quantity must be a number." })
		.positive("Quantity must be greater than zero."),
	unitPrice: z
		.number({ error: "Unit price must be a number." })
		.nonnegative("Unit price cannot be negative."),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
	client: z.string().trim().min(1, "Bill-to client is required."),
	job: z.string().trim().min(1, "Job is required."),
	invoiceNumber: z.string().trim().min(1, "Invoice number is required."),
	invoiceType: z.enum(
		["progress", "final", "retainage", "change_order", "deposit"],
		{ error: "Invoice type is required." },
	),
	dueDate: z.string().trim().min(1, "Due date is required."),
	taxRate: z
		.number({ error: "Tax rate must be a number." })
		.nonnegative("Tax rate cannot be negative.")
		.max(100, "Tax rate cannot exceed 100%."),
	items: z.array(lineItemSchema).min(1, "Add at least one line item."),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceType = InvoiceFormData["invoiceType"];

export const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
	{ value: "progress", label: "Progress" },
	{ value: "final", label: "Final" },
	{ value: "retainage", label: "Retainage" },
	{ value: "change_order", label: "Change order" },
	{ value: "deposit", label: "Deposit" },
];

export type InvoiceTotals = {
	subtotalCents: number;
	taxCents: number;
	totalCents: number;
};

/** All money math in integer cents. Rounds half away from zero per line. */
export function computeTotals(
	items: Pick<LineItem, "quantity" | "unitPrice">[],
	taxRatePct: number,
): InvoiceTotals {
	const subtotalCents = items.reduce((sum, item) => {
		if (
			!Number.isFinite(item.quantity) ||
			!Number.isFinite(item.unitPrice) ||
			item.quantity <= 0 ||
			item.unitPrice < 0
		) {
			return sum;
		}
		return sum + Math.round(item.quantity * item.unitPrice * 100);
	}, 0);
	const safeRate =
		Number.isFinite(taxRatePct) && taxRatePct >= 0 ? taxRatePct : 0;
	const taxCents = Math.round((subtotalCents * safeRate) / 100);
	return {
		subtotalCents,
		taxCents,
		totalCents: subtotalCents + taxCents,
	};
}

export function formatCents(cents: number): string {
	return (cents / 100).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
	});
}
