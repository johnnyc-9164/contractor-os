import { describe, expect, it } from "vitest";
import type { PipelineLead } from "./lead-card";
import {
	countLeads,
	filterLeadColumns,
	findLeadById,
	type LeadColumns,
	leadMatchesQuery,
	mergeReopenedLeads,
	reopenedLeadFromResult,
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

describe("findLeadById", () => {
	it("resolves selection from the latest active columns", () => {
		const updatedSarah = { ...sarah, stage: "Qualifying" as const };
		const updatedColumns: LeadColumns = {
			Prospect: [],
			Qualifying: [updatedSarah],
		};

		expect(findLeadById(updatedColumns, [], sarah.id)).toBe(updatedSarah);
	});

	it("resolves terminal records and clears missing selections", () => {
		const wonSarah = { ...sarah, stage: "Won" as const };

		expect(findLeadById(columns, [wonSarah], wonSarah.id)).toBe(sarah);
		expect(findLeadById({}, [wonSarah], wonSarah.id)).toBe(wonSarah);
		expect(findLeadById(columns, [wonSarah], "missing")).toBeNull();
		expect(findLeadById(columns, [wonSarah], null)).toBeNull();
	});
});

describe("reopened lead projection", () => {
	it("uses the new server record key and retains the terminal source record", () => {
		const source = { ...sarah, stage: "Lost" as const };
		const reopened = reopenedLeadFromResult(
			source,
			"lead_new",
			"principal@example.com",
			1_700_000_200_000,
		);
		expect(reopened).toMatchObject({
			id: "lead_new",
			identifier: "lead_new",
			stage: "Prospect",
			title: source.title,
		});
		expect(reopened).not.toBe(source);
		expect(source.stage).toBe("Lost");
		expect(reopenedLeadFromResult(source, null, null, 0)).toBeNull();
	});

	it("keeps the local lead until its linked component identifier appears", () => {
		const reopened = reopenedLeadFromResult(sarah, "lead_new", null, 5);
		if (!reopened) throw new Error("Expected reopened record");
		const local = { lead: reopened, componentIdentifier: "CO-NEW" };
		const terminalSource = { ...sarah, stage: "Lost" as const };

		expect(mergeReopenedLeads([terminalSource], [local])).toEqual([
			terminalSource,
			reopened,
		]);

		const componentCopy = {
			...reopened,
			id: "convex-id",
			identifier: "CO-NEW",
		};
		expect(
			mergeReopenedLeads([terminalSource, componentCopy], [local]),
		).toEqual([terminalSource, componentCopy]);
	});
});
