import { describe, expect, it, vi } from "vitest";
import { submitInvoiceDraft } from "./invoice-submission";

const draft = {
	job: " job-1 ",
	client: " client-1 ",
	invoiceNumber: " 1001 ",
	invoiceType: " final ",
	amount: "12.34",
	dueDate: "2026-10-30",
};

describe("invoice form submission", () => {
	it.each(["12abc", "1.2.3", "0", "-1", "Infinity", "NaN", "0.001"])(
		"keeps %s out of the mutation and provides an amount error",
		async (amount) => {
			const mutation = vi.fn().mockResolvedValue(undefined);
			const result = await submitInvoiceDraft({ ...draft, amount }, mutation);
			expect(result).toMatchObject({ ok: false, field: "amount" });
			expect(mutation).not.toHaveBeenCalled();
		},
	);

	it.each(["", "2026-02-30", "not-a-date"])(
		"keeps invalid due date %s out of the mutation",
		async (dueDate) => {
			const mutation = vi.fn().mockResolvedValue(undefined);
			const result = await submitInvoiceDraft({ ...draft, dueDate }, mutation);
			expect(result).toMatchObject({ ok: false, field: "dueDate" });
			expect(mutation).not.toHaveBeenCalled();
		},
	);

	it("sends 12.34 dollars to the workflow exactly once", async () => {
		const mutation = vi.fn().mockResolvedValue(undefined);
		expect(await submitInvoiceDraft(draft, mutation)).toEqual({ ok: true });
		expect(mutation).toHaveBeenCalledOnce();
		expect(mutation).toHaveBeenCalledWith({
			requestKey: expect.stringMatching(/^invoice-/),
			input: {
				job: "job-1",
				client: "client-1",
				invoice_number: "1001",
				invoice_type: "final",
				amount: 12.34,
				due_date: "2026-10-30T00:00:00.000Z",
			},
		});
	});
});
