// TC-APP-01: Tests for the pipeline transition map and op routing.

import { describe, expect, it } from "vitest";
import {
	BOARD_COLUMNS,
	DIALOG_FIELDS,
	isLegalTransition,
	LEGAL_TRANSITIONS,
	needsDialog,
	opForTransition,
	TERMINAL_STAGES,
} from "./transitions";

describe("BOARD_COLUMNS", () => {
	it("has exactly the 10 non-terminal stages", () => {
		expect(BOARD_COLUMNS).toHaveLength(10);
		expect(BOARD_COLUMNS).not.toContain("Won");
		expect(BOARD_COLUMNS).not.toContain("Lost");
		expect(BOARD_COLUMNS).not.toContain("Disqualified");
	});
});

describe("isLegalTransition", () => {
	it("allows the forward pipeline", () => {
		expect(isLegalTransition("Prospect", "Outreach Sent")).toBe(true);
		expect(isLegalTransition("Outreach Sent", "Reply Received")).toBe(true);
		expect(isLegalTransition("Reply Received", "Qualifying")).toBe(true);
		expect(isLegalTransition("Qualifying", "Site Visit Scheduled")).toBe(true);
		expect(isLegalTransition("Site Visit Scheduled", "Scope In Progress")).toBe(
			true,
		);
		expect(isLegalTransition("Scope In Progress", "Proposal Sent")).toBe(true);
		expect(isLegalTransition("Proposal Sent", "Bid Submitted")).toBe(true);
		expect(isLegalTransition("Bid Submitted", "Awarded")).toBe(true);
		expect(isLegalTransition("Awarded", "Won")).toBe(true);
	});

	it("allows hold from active stages", () => {
		for (const from of [
			"Qualifying",
			"Site Visit Scheduled",
			"Scope In Progress",
			"Proposal Sent",
			"Bid Submitted",
			"Awarded",
		] as const) {
			expect(isLegalTransition(from, "On Hold")).toBe(true);
		}
	});

	it("allows resume and re-open", () => {
		expect(isLegalTransition("On Hold", "Qualifying")).toBe(true);
		expect(isLegalTransition("Lost", "Prospect")).toBe(true);
		expect(isLegalTransition("Disqualified", "Prospect")).toBe(true);
	});

	it("refuses illegal jumps", () => {
		expect(isLegalTransition("Prospect", "Won")).toBe(false);
		expect(isLegalTransition("Prospect", "Awarded")).toBe(false);
		expect(isLegalTransition("Outreach Sent", "Proposal Sent")).toBe(false);
		expect(isLegalTransition("Won", "Prospect")).toBe(false);
		expect(isLegalTransition("Qualifying", "Won")).toBe(false);
	});

	it("matches the PM map for every stage", () => {
		for (const [from, tos] of Object.entries(LEGAL_TRANSITIONS)) {
			for (const to of tos) {
				expect(
					isLegalTransition(from as never, to as never),
					`${from} -> ${to}`,
				).toBe(true);
			}
		}
	});
});

describe("opForTransition", () => {
	it("maps the forward pipeline to lead.* ops", () => {
		expect(opForTransition("Prospect", "Outreach Sent")).toBe(
			"lead.sendOutreach",
		);
		expect(opForTransition("Outreach Sent", "Reply Received")).toBe(
			"lead.recordReply",
		);
		expect(opForTransition("Reply Received", "Qualifying")).toBe(
			"lead.qualify",
		);
		expect(opForTransition("Qualifying", "Site Visit Scheduled")).toBe(
			"lead.scheduleSiteVisit",
		);
		expect(opForTransition("Site Visit Scheduled", "Scope In Progress")).toBe(
			"lead.startScope",
		);
		expect(opForTransition("Scope In Progress", "Proposal Sent")).toBe(
			"lead.sendProposal",
		);
		expect(opForTransition("Proposal Sent", "Bid Submitted")).toBe(
			"lead.submitBid",
		);
		expect(opForTransition("Bid Submitted", "Awarded")).toBe("lead.award");
	});

	it("maps hold, terminal, resume, and re-open", () => {
		expect(opForTransition("Qualifying", "On Hold")).toBe("lead.hold");
		expect(opForTransition("Awarded", "On Hold")).toBe("lead.hold");
		expect(opForTransition("Proposal Sent", "Won")).toBe("lead.win");
		expect(opForTransition("Prospect", "Disqualified")).toBe("lead.disqualify");
		expect(opForTransition("Qualifying", "Lost")).toBe("lead.lose");
		expect(opForTransition("On Hold", "Qualifying")).toBe("lead.resume");
		expect(opForTransition("Lost", "Prospect")).toBe("lead.reopen");
		expect(opForTransition("Disqualified", "Prospect")).toBe("lead.reopen");
	});

	it("returns null for illegal transitions", () => {
		expect(opForTransition("Prospect", "Won")).toBeNull();
		expect(opForTransition("Won", "Prospect")).toBeNull();
	});
});

describe("needsDialog", () => {
	it("requires dialogs for ops needing more than lead_id", () => {
		for (const contract of [
			"lead.sendOutreach",
			"lead.recordReply",
			"lead.qualify",
			"lead.scheduleSiteVisit",
			"lead.sendProposal",
			"lead.submitBid",
			"lead.hold",
			"lead.disqualify",
			"lead.lose",
			"lead.reopen",
		]) {
			expect(needsDialog(contract), contract).toBe(true);
			expect(DIALOG_FIELDS[contract].length).toBeGreaterThan(0);
		}
	});

	it("skips dialogs for lead_id-only ops", () => {
		for (const contract of [
			"lead.startScope",
			"lead.award",
			"lead.win",
			"lead.resume",
		]) {
			expect(needsDialog(contract), contract).toBe(false);
		}
	});
});

describe("TERMINAL_STAGES", () => {
	it("covers Won, Lost, Disqualified", () => {
		expect([...TERMINAL_STAGES].sort()).toEqual(
			["Disqualified", "Lost", "Won"].sort(),
		);
	});
});
