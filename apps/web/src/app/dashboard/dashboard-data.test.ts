import { describe, expect, it } from "vitest";
import {
	type DashboardRecord,
	humanizeState,
	pageScopeLabel,
	sortRecent,
	summarizeOperations,
} from "./dashboard-data";

const record = (
	id: string,
	state: string,
	updatedAt?: number,
): DashboardRecord => ({
	id,
	identifier: `record-${id}`,
	state,
	title: null,
	updatedAt,
});

describe("dashboard data", () => {
	it("derives operational metrics from live records", () => {
		const metrics = summarizeOperations(
			[
				record("1", "Prospect"),
				record("2", "Reply Received"),
				record("3", "site_visit_scheduled"),
				record("4", "Won"),
				record("5", "Lost"),
			],
			[
				record("6", "Scheduled"),
				record("7", "in-progress"),
				record("8", "Completed"),
			],
		);

		expect(metrics).toEqual({ activeJobs: 2, followUps: 2, openLeads: 3 });
	});

	it("orders recent records without mutating the query result", () => {
		const records = [record("1", "new", 10), record("2", "new", 30)];

		expect(sortRecent(records, 1).map(({ id }) => id)).toEqual(["2"]);
		expect(records.map(({ id }) => id)).toEqual(["1", "2"]);
	});

	it("labels bounded pages honestly", () => {
		expect(pageScopeLabel(100, false)).toBe("First 100 live records");
		expect(pageScopeLabel(1, true)).toBe("1 live record");
		expect(pageScopeLabel(4, true)).toBe("4 live records");
	});

	it("turns machine states into compact labels", () => {
		expect(humanizeState("site_visit-scheduled")).toBe("Site Visit Scheduled");
	});
});
