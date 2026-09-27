import { describe, expect, it } from "vitest";
import {
	dollarsToCents,
	formatDollars,
	lineItemsTotalDollars,
	quoteFormSchema,
} from "./schemas";

const baseInterior = {
	job_type: "interior" as const,
	rooms: "Living room, kitchen",
	surfaces: ["Walls", "Ceilings"],
	scope_notes: "Two coats",
	prep_notes: "Light sanding",
	line_items: [{ description: "Labor", amount: 8000 }],
};

const baseExterior = {
	job_type: "exterior" as const,
	stories: 2,
	siding: "Vinyl",
	square_footage: 2400,
	scope_notes: "",
	prep_notes: "",
	line_items: [{ description: "Labor", amount: 9500 }],
};

describe("quoteFormSchema", () => {
	it("accepts a valid interior quote", () => {
		const result = quoteFormSchema.safeParse(baseInterior);
		expect(result.success).toBe(true);
	});

	it("accepts a valid exterior quote", () => {
		const result = quoteFormSchema.safeParse(baseExterior);
		expect(result.success).toBe(true);
	});

	it("rejects interior without rooms", () => {
		const result = quoteFormSchema.safeParse({ ...baseInterior, rooms: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((i) => i.path.join(".") === "rooms"),
			).toBe(true);
		}
	});

	it("rejects interior without surfaces", () => {
		const result = quoteFormSchema.safeParse({ ...baseInterior, surfaces: [] });
		expect(result.success).toBe(false);
	});

	it("rejects exterior without stories", () => {
		const result = quoteFormSchema.safeParse({
			...baseExterior,
			stories: Number.NaN,
		});
		expect(result.success).toBe(false);
	});

	it("rejects exterior without siding", () => {
		const result = quoteFormSchema.safeParse({ ...baseExterior, siding: "" });
		expect(result.success).toBe(false);
	});

	it("rejects exterior without square footage", () => {
		const result = quoteFormSchema.safeParse({
			...baseExterior,
			square_footage: Number.NaN,
		});
		expect(result.success).toBe(false);
	});

	it("rejects a line item without description", () => {
		const result = quoteFormSchema.safeParse({
			...baseInterior,
			line_items: [{ description: "", amount: 100 }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a line item with zero amount", () => {
		const result = quoteFormSchema.safeParse({
			...baseInterior,
			line_items: [{ description: "Labor", amount: 0 }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects no line items", () => {
		const result = quoteFormSchema.safeParse({
			...baseInterior,
			line_items: [],
		});
		expect(result.success).toBe(false);
	});
});

describe("totals", () => {
	it("sums line items", () => {
		expect(
			lineItemsTotalDollars([
				{ description: "Labor", amount: 8000 },
				{ description: "Materials", amount: 4500 },
			]),
		).toBe(12500);
	});

	it("converts $12,500 to 1250000 cents", () => {
		expect(dollarsToCents(12500)).toBe(1250000);
	});

	it("formats dollars", () => {
		expect(formatDollars(12500)).toBe("$12,500.00");
	});
});
