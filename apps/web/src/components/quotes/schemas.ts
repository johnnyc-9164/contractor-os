import { z } from "zod";

export const JOB_TYPES = ["interior", "exterior"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const INTERIOR_SURFACES = [
	"Walls",
	"Ceilings",
	"Trim & doors",
	"Cabinets",
] as const;

export const EXTERIOR_SIDING = [
	"Vinyl",
	"Wood",
	"Fiber cement",
	"Brick",
	"Stucco",
	"Aluminum",
	"Other",
] as const;

// Empty-string inputs become undefined so optional numeric fields don't
// coerce "" -> 0. Invalid non-empty input still fails the number check.
const optionalStories = z.number().int().min(1).max(10).optional();

const optionalSquareFootage = z.number().positive().optional();

export const lineItemSchema = z.object({
	description: z.string().trim().min(1, "Describe the line item"),
	amount: z.number({ message: "Enter an amount" }).positive({
		message: "Amount must be greater than zero",
	}),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const quoteFormSchema = z
	.object({
		job_type: z.enum(JOB_TYPES, { message: "Select interior or exterior" }),
		// Interior branch
		rooms: z.string().trim().optional(),
		surfaces: z.array(z.string()).optional(),
		// Exterior branch
		stories: optionalStories,
		siding: z.string().trim().optional(),
		square_footage: optionalSquareFootage,
		// Scope details
		scope_notes: z.string().trim().optional(),
		prep_notes: z.string().trim().optional(),
		// Line items
		line_items: z.array(lineItemSchema).min(1, "Add at least one line item"),
	})
	.superRefine((data, ctx) => {
		if (data.job_type === "interior") {
			if (!data.rooms?.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["rooms"],
					message: "List the rooms to be painted",
				});
			}
			if (!data.surfaces || data.surfaces.length === 0) {
				ctx.addIssue({
					code: "custom",
					path: ["surfaces"],
					message: "Select at least one surface",
				});
			}
		}
		if (data.job_type === "exterior") {
			if (
				data.stories === undefined ||
				Number.isNaN(data.stories) ||
				data.stories < 1
			) {
				ctx.addIssue({
					code: "custom",
					path: ["stories"],
					message: "Enter the number of stories",
				});
			}
			if (!data.siding?.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["siding"],
					message: "Select the siding type",
				});
			}
			if (
				data.square_footage === undefined ||
				Number.isNaN(data.square_footage) ||
				data.square_footage <= 0
			) {
				ctx.addIssue({
					code: "custom",
					path: ["square_footage"],
					message: "Enter the approximate square footage",
				});
			}
		}
	});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Field names validated when advancing past each step (react-hook-form trigger).
export const STEP_FIELDS: Array<Array<keyof QuoteFormValues>> = [
	["job_type", "rooms", "surfaces", "stories", "siding", "square_footage"],
	["scope_notes", "prep_notes"],
	["line_items"],
	[],
];

export const STEP_LABELS = [
	"Job type",
	"Scope details",
	"Line items",
	"Review & send",
] as const;

export function defaultValues(): QuoteFormValues {
	return {
		job_type: "interior",
		rooms: "",
		surfaces: [],
		stories: undefined,
		siding: "",
		square_footage: undefined,
		scope_notes: "",
		prep_notes: "",
		line_items: [{ description: "", amount: Number.NaN }],
	};
}

export function lineItemsTotalDollars(items: LineItem[]): number {
	return items.reduce((sum, item) => {
		const amount = typeof item.amount === "number" ? item.amount : 0;
		return sum + (Number.isFinite(amount) ? amount : 0);
	}, 0);
}

export function dollarsToCents(dollars: number): number {
	return Math.round(dollars * 100);
}

export function formatDollars(dollars: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(dollars);
}
