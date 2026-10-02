import { usePaginatedQuery } from "convex/react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JobsError from "./error";
import type { JobSummary } from "./jobs-page";
import JobsPage from "./page";

vi.mock("@clerk/nextjs", () => ({
	SignInButton: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("convex/react", () => ({
	Authenticated: ({ children }: { children: ReactNode }) => children,
	AuthLoading: () => null,
	Unauthenticated: () => null,
	usePaginatedQuery: vi.fn(),
}));

const firstJob: JobSummary = {
	id: "record-1",
	identifier: "job-001",
	title: "Exterior repaint",
	state: "in_progress",
	updatedAt: 1_725_235_200_000,
};

function renderJobs(
	status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted",
	results: JobSummary[],
) {
	vi.mocked(usePaginatedQuery).mockReturnValue({
		results,
		status,
		loadMore: vi.fn(),
		isLoading: status === "LoadingFirstPage" || status === "LoadingMore",
	} as unknown as ReturnType<typeof usePaginatedQuery>);
	return renderToStaticMarkup(createElement(JobsPage));
}

describe("jobs worklist states", () => {
	beforeEach(() => vi.resetAllMocks());

	it("shows loading without displaying stale rows before the first page", () => {
		const html = renderJobs("LoadingFirstPage", [firstJob]);
		expect(html).toContain("Loading jobs");
		expect(html).not.toContain(firstJob.identifier);
	});

	it("distinguishes an exhausted empty worklist from a page that can load more", () => {
		expect(renderJobs("Exhausted", [])).toContain("No jobs yet");
		const html = renderJobs("CanLoadMore", []);
		expect(html).toContain("Load more jobs");
		expect(html).not.toContain("No jobs yet");
	});

	it("renders one current card per id across overlapping pages", () => {
		const html = renderJobs("CanLoadMore", [
			firstJob,
			{
				...firstJob,
				title: "Updated exterior repaint",
				updatedAt: firstJob.updatedAt + 1,
			},
		]);
		expect(html).toContain("1 job loaded");
		expect(html).toContain("Updated exterior repaint");
		expect(html.match(/job-001/g)).toHaveLength(1);
		expect(html).toContain("Load more jobs");
	});

	it("disables pagination while loading and shows completion when exhausted", () => {
		const loading = renderJobs("LoadingMore", [firstJob]);
		expect(loading).toContain("Loading more jobs");
		expect(loading).toMatch(/<button[^>]*disabled/);

		const exhausted = renderJobs("Exhausted", [firstJob]);
		expect(exhausted).toContain("All loaded jobs are shown");
		expect(exhausted).not.toContain("Load more jobs");
	});

	it("lets a failed query reach the route boundary and offers a retry", () => {
		vi.mocked(usePaginatedQuery).mockImplementation(() => {
			throw new Error("jobs request failed");
		});
		expect(() => renderToStaticMarkup(createElement(JobsPage))).toThrow(
			"jobs request failed",
		);

		const html = renderToStaticMarkup(
			createElement(JobsError, { reset: vi.fn() }),
		);
		expect(html).toContain('role="alert"');
		expect(html).toContain("Jobs could not be loaded");
		expect(html).toContain("Try again");
	});
});
