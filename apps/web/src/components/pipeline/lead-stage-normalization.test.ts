import { describe, expect, it } from "vitest";
import { toLeadStage } from "./lead-stage-normalization";
import { BOARD_COLUMNS, TERMINAL_STAGES } from "./transitions";

// The installed component's ten raw lead-stage enum values.
const componentStages = [
	["new", "Prospect"],
	["qualifying", "Qualifying"],
	["site_visit_scheduled", "Site Visit Scheduled"],
	["scope_in_progress", "Scope In Progress"],
	["proposal_sent", "Proposal Sent"],
	["bid_submitted", "Bid Submitted"],
	["awarded", "Awarded"],
	["won", "Won"],
	["lost", "Lost"],
	["on_hold", "On Hold"],
] as const;

// Existing leads-list aliases outside the installed component's enum.
const listOnlyStages = [
	["outreach_sent", "Outreach Sent"],
	["reply_received", "Reply Received"],
	["disqualified", "Disqualified"],
] as const;

describe("toLeadStage", () => {
	it.each(componentStages)("maps component stage %s to %s", (state, label) => {
		expect(toLeadStage(state)).toBe(label);
	});

	it.each(listOnlyStages)("preserves list alias %s as %s", (state, label) => {
		expect(toLeadStage(state)).toBe(label);
	});

	it.each([...componentStages, ...listOnlyStages])(
		"preserves the canonical label for %s",
		(_state, label) => {
			expect(toLeadStage(label)).toBe(label);
		},
	);

	it.each([...componentStages, ...listOnlyStages])(
		"trims both raw and display forms of %s",
		(state, label) => {
			expect(toLeadStage(` \t${state}\n `)).toBe(label);
			expect(toLeadStage(` \t${label}\n `)).toBe(label);
		},
	);

	it.each(["unknown_future_stage", "", " \t\n ", "NEW", "prospect"])(
		"leaves unsupported state %j unmapped",
		(state) => {
			expect(toLeadStage(state)).toBeNull();
		},
	);

	it("places active aliases only in board columns", () => {
		for (const state of [
			"new",
			"qualifying",
			"site_visit_scheduled",
			"scope_in_progress",
			"proposal_sent",
			"bid_submitted",
			"awarded",
			"on_hold",
			"outreach_sent",
			"reply_received",
		]) {
			const stage = toLeadStage(state);
			expect(BOARD_COLUMNS, state).toContain(stage);
			expect(TERMINAL_STAGES, state).not.toContain(stage);
		}
	});

	it("places won, lost, and the disqualified alias only in completed stages", () => {
		for (const state of ["won", "lost", "disqualified"]) {
			const stage = toLeadStage(state);
			expect(TERMINAL_STAGES, state).toContain(stage);
			expect(BOARD_COLUMNS, state).not.toContain(stage);
		}
	});
});
