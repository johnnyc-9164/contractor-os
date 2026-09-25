import { describe, expect, it } from "vitest";
import { displayStage, nextStage, stageGroup } from "./lead-stages";

describe("lead stages", () => {
	it.each([
		["new", "Prospect"],
		["qualifying", "Qualifying"],
		["site_visit_scheduled", "Site Visit Scheduled"],
		["scope_in_progress", "Scope In Progress"],
		["proposal_sent", "Proposal Sent"],
		["bid_submitted", "Bid Submitted"],
		["awarded", "Awarded"],
		["won", "Won"],
		["on_hold", "On Hold"],
		["disqualified", "Disqualified"],
		["lost", "Lost"],
	])("maps %s to %s", (state, label) => {
		expect(displayStage(state)).toBe(label);
	});

	it("maps the front-half pipeline states", () => {
		expect(displayStage("outreach_sent")).toBe("Outreach Sent");
		expect(displayStage("reply_received")).toBe("Reply Received");
	});

	it("renders unknown backend stages verbatim", () => {
		expect(displayStage("some_future_state")).toBe("some_future_state");
	});

	it.each([
		["new", "Outreach Sent"],
		["proposal_sent", "Bid Submitted"],
		["on_hold", "Qualifying"],
		["lost", "Prospect (re-open)"],
		["won", null],
		["unmapped", null],
	])("returns the first forward transition for %s", (state, next) => {
		expect(nextStage(state)).toBe(next);
	});

	it("groups loaded stages for metrics", () => {
		expect(stageGroup("new")).toBe("active");
		expect(stageGroup("on_hold")).toBe("on-hold");
		expect(stageGroup("lost")).toBe("terminal");
	});
});
