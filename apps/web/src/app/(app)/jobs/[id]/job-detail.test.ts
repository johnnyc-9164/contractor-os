import { describe, expect, it } from "vitest";
import {
	formatJobDate,
	formatJobMoney,
	type JobProjection,
	jobDetailState,
	jobStatus,
	recordedProgress,
} from "./job-detail";

const ownedJob: JobProjection = {
	identifier: "job-1042",
	title: "Johnson residence",
	revision: 3,
	evaluatedAt: 1_725_235_200_000,
	mirrors: { state: { status: "computed", value: "active" } },
};

const balances = {
	identifier: "job-1042",
	currency: "USD" as const,
	contractAmount: 12785.68,
	billedToDate: 6392.84,
	collectedToDate: 0,
	outstandingBalance: 6392.84,
};

describe("job detail presentation", () => {
	it("does not expose financial content before an owned record resolves", () => {
		expect(jobDetailState(undefined, undefined)).toBe("loading");
		expect(jobDetailState(null, balances)).toBe("missing");
		expect(jobDetailState(ownedJob, undefined)).toBe("loading-financials");
	});

	it("shows an owned record even when the safe financial read has no data", () => {
		expect(jobDetailState(ownedJob, null)).toBe("ready");
		expect(jobStatus(ownedJob)).toBe("active");
	});

	it("does not claim a status when the source mirror is unavailable", () => {
		expect(
			jobStatus({
				...ownedJob,
				mirrors: { state: { status: "unavailable", value: "active" } },
			}),
		).toBeNull();
	});

	it("formats the backend's dollar amounts without dividing by 100", () => {
		expect(formatJobMoney(balances.contractAmount, balances.currency)).toBe(
			"$12,785.68",
		);
		expect(formatJobMoney(balances.outstandingBalance, balances.currency)).toBe(
			"$6,392.84",
		);
	});

	it("only presents persisted valid dates and progress", () => {
		expect(formatJobDate("2026-10-01T09:00:00.000Z")).toBe("Oct 1, 2026");
		expect(formatJobDate("invalid")).toBeNull();
		expect(recordedProgress(0)).toBe(0);
		expect(recordedProgress(42)).toBe(42);
		expect(recordedProgress(120)).toBeNull();
	});
});
