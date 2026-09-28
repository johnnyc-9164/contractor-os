import { useQuery } from "convex/react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JobDetailError from "./error";
import JobDetailPage from "./page";

vi.mock("@clerk/nextjs", () => ({
	SignInButton: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "job-1042" }) }));
vi.mock("convex/react", () => ({
	Authenticated: ({ children }: { children: ReactNode }) => children,
	AuthLoading: () => null,
	Unauthenticated: () => null,
	useQuery: vi.fn(),
}));

const record = {
	identifier: "job-1042",
	title: "Johnson residence",
	revision: 3,
	evaluatedAt: 1_725_235_200_000,
	mirrors: {},
};
const details = {
	identifier: "job-1042",
	title: "Johnson residence",
	revision: 3,
	updatedAt: 1_725_235_200_000,
	status: "in_progress",
	jobType: "residential",
	address: "12 Main Street",
	city: "Chicago",
	state: "IL",
	startDate: "2026-10-01T09:00:00.000Z",
	projectedEndDate: null,
	percentComplete: 42,
};
const financials = {
	identifier: "job-1042",
	currency: "USD",
	contractAmount: 1200,
	billedToDate: 600,
	collectedToDate: 0,
	outstandingBalance: 600,
};

function render(
	recordValue: unknown,
	detailValue: unknown,
	financialValue: unknown,
) {
	vi.mocked(useQuery)
		.mockReturnValueOnce(recordValue as ReturnType<typeof useQuery>)
		.mockReturnValueOnce(detailValue as ReturnType<typeof useQuery>)
		.mockReturnValueOnce(financialValue as ReturnType<typeof useQuery>);
	return renderToStaticMarkup(createElement(JobDetailPage));
}

describe("job detail route", () => {
	beforeEach(() => vi.resetAllMocks());

	it("shows recorded job facts and backend dollar amounts for an owned job", () => {
		const html = render(record, details, financials);
		expect(html).toContain("Johnson residence");
		expect(html).toContain("12 Main Street");
		expect(html).toContain("42% complete");
		expect(html).toContain("Oct 1, 2026");
		expect(html).toContain("$1,200.00");
		expect(html).toContain("Outstanding invoices");
	});

	it("does not display stale details or balances when the record is absent", () => {
		const html = render(null, details, financials);
		expect(html).toContain("Job unavailable");
		expect(html).not.toContain("12 Main Street");
		expect(html).not.toContain("$1,200.00");
	});

	it("offers a generic error state when authorization or query fails", () => {
		vi.mocked(useQuery).mockImplementation(() => {
			throw new Error("FORBIDDEN");
		});
		expect(() => renderToStaticMarkup(createElement(JobDetailPage))).toThrow(
			"FORBIDDEN",
		);
		const html = renderToStaticMarkup(
			createElement(JobDetailError, { reset: vi.fn() }),
		);
		expect(html).toContain("Job unavailable");
		expect(html).not.toContain("FORBIDDEN");
		expect(html).toContain("Try again");
	});
});
