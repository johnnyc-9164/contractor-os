import { describe, expect, it } from "vitest";
import {
	computeTotals,
	formatCents,
	invoiceFormSchema,
	lineItemSchema,
} from "./invoice-schema";

const VALID_FORM = {
	client: "Jane Homeowner",
	job: "Exterior repaint",
	invoiceNumber: "INV-2026-001",
	invoiceType: "final" as const,
	dueDate: "2026-10-15",
	taxRate: 10,
	items: [{ description: "Siding repaint", quantity: 2, unitPrice: 500 }],
};

describe("computeTotals", () => {
	it("computes the contract worked example: 2 x $500 + 10% tax", () => {
		const totals = computeTotals([{ quantity: 2, unitPrice: 500 }], 10);
		expect(totals.subtotalCents).toBe(100000);
		expect(totals.taxCents).toBe(10000);
		expect(totals.totalCents).toBe(110000);
	});

	it("handles fractional quantities", () => {
		const totals = computeTotals([{ quantity: 1.5, unitPrice: 100 }], 0);
		expect(totals.subtotalCents).toBe(15000);
		expect(totals.totalCents).toBe(15000);
	});

	it("rounds each line to the nearest cent", () => {
		// $19.995 per line item rounds to 2000 cents.
		const totals = computeTotals([{ quantity: 1, unitPrice: 19.995 }], 0);
		expect(totals.subtotalCents).toBe(2000);
	});

	it("returns zeros for an empty items array", () => {
		expect(computeTotals([], 8.5)).toEqual({
			subtotalCents: 0,
			taxCents: 0,
			totalCents: 0,
		});
	});

	it("skips non-finite or out-of-range line values instead of NaN-ing the total", () => {
		const totals = computeTotals(
			[
				{ quantity: Number.NaN, unitPrice: 100 },
				{ quantity: 1, unitPrice: 200 },
				{ quantity: 0, unitPrice: 999 },
				{ quantity: 2, unitPrice: -5 },
			],
			10,
		);
		expect(totals.subtotalCents).toBe(20000);
		expect(totals.taxCents).toBe(2000);
		expect(totals.totalCents).toBe(22000);
	});

	it("treats a non-finite or negative tax rate as 0%", () => {
		expect(
			computeTotals([{ quantity: 1, unitPrice: 100 }], Number.NaN).taxCents,
		).toBe(0);
		expect(computeTotals([{ quantity: 1, unitPrice: 100 }], -5).taxCents).toBe(
			0,
		);
	});
});

describe("formatCents", () => {
	it("formats 110000 as $1,100.00", () => {
		expect(formatCents(110000)).toBe("$1,100.00");
	});

	it("formats zero and negative amounts", () => {
		expect(formatCents(0)).toBe("$0.00");
		expect(formatCents(-1500)).toBe("-$15.00");
	});
});

describe("invoiceFormSchema guards", () => {
	it("accepts a fully valid form", () => {
		expect(invoiceFormSchema.safeParse(VALID_FORM).success).toBe(true);
	});

	it("rejects an empty item description", () => {
		const result = invoiceFormSchema.safeParse({
			...VALID_FORM,
			items: [{ description: "  ", quantity: 1, unitPrice: 100 }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a zero quantity", () => {
		expect(
			lineItemSchema.safeParse({
				description: "Paint",
				quantity: 0,
				unitPrice: 100,
			}).success,
		).toBe(false);
	});

	it("rejects a negative unit price", () => {
		expect(
			lineItemSchema.safeParse({
				description: "Paint",
				quantity: 1,
				unitPrice: -0.01,
			}).success,
		).toBe(false);
	});

	it("rejects NaN quantity and unit price", () => {
		expect(
			lineItemSchema.safeParse({
				description: "Paint",
				quantity: Number.NaN,
				unitPrice: 100,
			}).success,
		).toBe(false);
		expect(
			lineItemSchema.safeParse({
				description: "Paint",
				quantity: 1,
				unitPrice: Number.NaN,
			}).success,
		).toBe(false);
	});

	it("rejects an empty items array", () => {
		const result = invoiceFormSchema.safeParse({ ...VALID_FORM, items: [] });
		expect(result.success).toBe(false);
	});

	it("rejects a tax rate above 100%", () => {
		const result = invoiceFormSchema.safeParse({ ...VALID_FORM, taxRate: 101 });
		expect(result.success).toBe(false);
	});
});
