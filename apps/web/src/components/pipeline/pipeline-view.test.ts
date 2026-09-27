import { describe, expect, it } from "vitest";
import type { PipelineLead } from "./lead-card";
import {
	countLeads,
	filterLeadColumns,
	type LeadColumns,
	leadMatchesQuery,
} from "./pipeline-view";

const sarah: PipelineLead = {
	id: "lead-1",
	identifier: "LEAD-1042",
	title: "Sarah Jenkins",
	stage: "Prospect",
	updatedAt: 1_700_000_000_000,
	lastHandledBy: "dispatcher@example.com",
};

const elena: PipelineLead = {
	id: "lead-2",
	identifier: "LEAD-1043",
	title: "Elena Rodriguez",
	stage: "Reply Received",
	updatedAt: 1_700_000_100_000,
	lastHandledBy: null,
};

const columns: LeadColumns = {
	Prospect: [sarah],
	"Reply Received": [elena],
	Qualifying: [],
};

describe("leadMatchesQuery", () => {
	it("matches live lead fields case-insensitively", () => {
		expect(leadMatchesQuery(sarah, "sarah")).toBe(true);
		expect(leadMatchesQuery(sarah, "LEAD-1042")).toBe(true);
		expect(leadMatchesQuery(sarah, "prospect")).toBe(true);
		expect(leadMatchesQuery(sarah, "DISPATCHER@EXAMPLE.COM")).toBe(true);
		expect(leadMatchesQuery(sarah, "Elena")).toBe(false);
	});

	it("treats an empty or whitespace-only query as a match", () => {
		expect(leadMatchesQuery(sarah, "")).toBe(true);
		expect(leadMatchesQuery(sarah, "   ")).toBe(true);
	});
});

describe("filterLeadColumns", () => {
	it("keeps the board stage structure while filtering cards", () => {
		expect(filterLeadColumns(columns, "elena")).toEqual({
			Prospect: [],
			"Reply Received": [elena],
			Qualifying: [],
		});
	});

	it("returns the original columns when no filter is active", () => {
		expect(filterLeadColumns(columns, "  ")).toBe(columns);
	});
});

describe("countLeads", () => {
	it("counts cards across every stage", () => {
		expect(countLeads(columns)).toBe(2);
		expect(countLeads(filterLeadColumns(columns, "missing"))).toBe(0);
	});
});
