import { describe, expect, it } from "vitest";
import {
	customerInitials,
	filterCustomers,
	type LeadListRecord,
	selectCustomers,
} from "./customer-crm-model";

const leads: LeadListRecord[] = [
	{
		id: "lead-1",
		identifier: "co-lead-new",
		title: "Entry repaint",
		state: "new",
		revision: 1,
		updatedAt: 10,
	},
	{
		id: "lead-2",
		identifier: "co-lead-alder",
		title: "Alder Street exterior",
		state: "won",
		revision: 4,
		updatedAt: 20,
	},
	{
		id: "lead-3",
		identifier: "co-lead-lake",
		title: "Lake House interior",
		state: " Won ",
		revision: 2,
		updatedAt: 30,
	},
	{
		id: "lead-4",
		identifier: "co-lead-lost",
		title: "Lost opportunity",
		state: "lost",
		revision: 3,
		updatedAt: 40,
	},
];

describe("selectCustomers", () => {
	it("keeps only won leads and orders the newest activity first", () => {
		expect(selectCustomers(leads)).toEqual([
			expect.objectContaining({
				identifier: "co-lead-lake",
				state: "won",
			}),
			expect.objectContaining({
				identifier: "co-lead-alder",
				state: "won",
			}),
		]);
	});

	it("does not treat awarded or other terminal leads as customers", () => {
		const customers = selectCustomers([
			{ ...leads[0], state: "awarded" },
			{ ...leads[0], state: "disqualified" },
			{ ...leads[0], state: "lost" },
		]);

		expect(customers).toEqual([]);
	});
});

describe("filterCustomers", () => {
	const customers = selectCustomers(leads);

	it("matches a title without case sensitivity", () => {
		expect(filterCustomers(customers, "lake HOUSE")).toHaveLength(1);
	});

	it("matches the stable lead identifier", () => {
		expect(filterCustomers(customers, "ALDER")).toEqual([
			expect.objectContaining({ identifier: "co-lead-alder" }),
		]);
	});

	it("returns the loaded customer list for a blank query", () => {
		expect(filterCustomers(customers, "   ")).toBe(customers);
	});
});

describe("customerInitials", () => {
	it("uses the first two title words", () => {
		expect(customerInitials(selectCustomers(leads)[0])).toBe("LH");
	});

	it("uses a neutral fallback when the lead has no title", () => {
		const [customer] = selectCustomers([
			{ ...leads[1], title: null, state: "won" },
		]);
		expect(customerInitials(customer)).toBe("CU");
	});
});
