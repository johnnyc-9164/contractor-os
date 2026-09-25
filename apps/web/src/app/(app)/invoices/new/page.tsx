import { InvoiceBuilder } from "../../../../components/invoices/invoice-builder";

export default async function NewInvoicePage({
	searchParams,
}: {
	searchParams: Promise<{ lead_id?: string }>;
}) {
	const { lead_id } = await searchParams;

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">New invoice</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Add line items, review the totals, and create the invoice.
				</p>
			</div>
			<InvoiceBuilder leadId={lead_id} />
		</div>
	);
}
