import { describe, expect, it } from "vitest";
import {
	formatJobState,
	type JobSummary,
	jobTitle,
	uniqueJobs,
} from "./jobs-page";

const firstPage: JobSummary[] = [
	{
		id: "doc-1",
		identifier: "job-001",
		title: "Exterior repaint",
		state: "in_progress",
		updatedAt: 1_725_235_200_000,
	},
	{
		id: "doc-2",
		identifier: "job-002",
		title: null,
		state: "scheduled",
		updatedAt: 1_725_321_600_000,
	},
];

describe("jobs worklist data", () => {
	it("appends a second page while keeping one current row per job", () => {
		const jobs = uniqueJobs([
			...firstPage,
			{
				...firstPage[1],
				title: "Interior repaint",
				updatedAt: 1_725_408_000_000,
			},
			{
				id: "doc-3",
				identifier: "job-003",
				title: "Cabinet refinishing",
				state: "ready_to_start",
				updatedAt: 1_725_494_400_000,
			},
		]);

		expect(jobs).toHaveLength(3);
		expect(jobs.map((job) => job.identifier)).toEqual([
			"job-001",
			"job-002",
			"job-003",
		]);
		expect(jobs[1]?.title).toBe("Interior repaint");
	});

	it("does not replace a newer job with an older overlapping page row", () => {
		const latest = { ...firstPage[0], title: "Current title" };
		const older = {
			...latest,
			title: "Old title",
			updatedAt: latest.updatedAt - 1,
		};

		expect(uniqueJobs([latest, older])).toEqual([latest]);
	});

	it("uses the stable identifier when a job has no title", () => {
		expect(jobTitle(firstPage[1])).toBe("job-002");
	});

	it("renders machine states as readable labels without changing their meaning", () => {
		expect(formatJobState("ready_to_start")).toBe("Ready to start");
		expect(formatJobState("in-progress")).toBe("In progress");
		expect(formatJobState("UNKNOWN")).toBe("Unknown");
	});
});
