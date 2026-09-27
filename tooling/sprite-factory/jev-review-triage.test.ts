import { describe, expect, it, vi } from "vitest";
import {
	type ChangeSummary,
	classifyChanges,
	parseGitDiffSummaries,
} from "./jev-review-triage";

function successfulResponse(inputs: string[], label = "low-review-effort") {
	return new Response(
		JSON.stringify({
			results: inputs.map(() => ({ label, confidence: 0.97, scores: {} })),
		}),
		{ status: 200 },
	);
}

describe("classifyChanges", () => {
	it("sends only coarse metadata to the free classifier and keeps mandatory review", async () => {
		const fetcher = vi.fn(
			async (_url: RequestInfo | URL, init?: RequestInit) => {
				const body = JSON.parse(String(init?.body)) as { inputs: string[] };
				return successfulResponse(body.inputs);
			},
		);
		const change = {
			path: "apps/web/src/components/pipeline/lead-card.tsx",
			status: "modified",
			additions: 8,
			deletions: 2,
			patch: "private-source-secret",
		} as ChangeSummary & { patch: string };

		const [result] = await classifyChanges([change], fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		const firstCall = fetcher.mock.calls.at(0);
		if (!firstCall) throw new Error("Expected classifier request");
		const payload = JSON.parse(String((firstCall[1] as RequestInit).body)) as {
			inputs: string[];
			labels: string[];
			tier: string;
		};

		expect(payload.inputs).toEqual([
			"category=app-ui; extension=.tsx; status=modified; additions=8; deletions=2",
		]);
		expect(JSON.stringify(payload)).not.toContain("lead-card");
		expect(JSON.stringify(payload)).not.toContain("private-source-secret");
		expect(payload.tier).toBe("fast");
		expect(result).toMatchObject({
			effort: "light",
			source: "classifier",
			requiresIndependentReview: true,
			requiresMandatoryChecks: true,
		});
	});

	it("keeps sensitive or integration files local and assigns deep review", async () => {
		const fetcher = vi.fn();
		const [result] = await classifyChanges(
			[
				{
					path: "packages/backend/convex/auth.ts",
					status: "modified",
					additions: 2,
					deletions: 1,
				},
			],
			fetcher,
		);

		expect(fetcher).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			effort: "deep",
			source: "deterministic",
			requiresIndependentReview: true,
			requiresMandatoryChecks: true,
		});
	});

	it.each(["AGENTS.md", "CLAUDE.md", "DESIGN.md", "auth.ts", "proxy.ts"])(
		"keeps root policy and auth entry files local: %s",
		async (path) => {
			const fetcher = vi.fn();
			const [result] = await classifyChanges(
				[{ path, status: "modified", additions: 1, deletions: 0 }],
				fetcher,
			);

			expect(fetcher).not.toHaveBeenCalled();
			expect(result).toMatchObject({ effort: "deep", source: "deterministic" });
		},
	);

	it("falls back to standard review when confidence is uncertain", async () => {
		const fetcher = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						results: [{ label: "low-review-effort", confidence: null }],
					}),
					{ status: 200 },
				),
		);
		const [result] = await classifyChanges(
			[
				{
					path: "apps/web/src/components/lead.tsx",
					status: "modified",
					additions: 2,
					deletions: 1,
				},
			],
			fetcher,
		);

		expect(result).toMatchObject({
			effort: "standard",
			source: "fallback",
			requiresIndependentReview: true,
			requiresMandatoryChecks: true,
		});
	});

	it("falls back without failing the task when the free endpoint is unavailable", async () => {
		const fetcher = vi.fn(async () => {
			throw new Error("offline");
		});
		const [result] = await classifyChanges(
			[
				{
					path: "packages/ui/src/components/avatar.tsx",
					status: "added",
					additions: 109,
					deletions: 0,
				},
			],
			fetcher,
		);

		expect(result).toMatchObject({
			effort: "standard",
			source: "fallback",
			requiresIndependentReview: true,
			requiresMandatoryChecks: true,
		});
	});

	it("splits requests at the free API's 1,000 input limit", async () => {
		const fetcher = vi.fn(
			async (_url: RequestInfo | URL, init?: RequestInit) => {
				const body = JSON.parse(String(init?.body)) as { inputs: string[] };
				return successfulResponse(body.inputs, "standard-review-effort");
			},
		);
		const changes: ChangeSummary[] = Array.from(
			{ length: 1_001 },
			(_, index) => ({
				path: `apps/web/src/components/card-${index}.tsx`,
				status: "modified",
				additions: 1,
				deletions: 0,
			}),
		);

		const results = await classifyChanges(changes, fetcher);
		const requestSizes = fetcher.mock.calls.map(
			([, init]) =>
				(JSON.parse(String(init?.body)) as { inputs: string[] }).inputs.length,
		);

		expect(requestSizes).toEqual([1_000, 1]);
		expect(results).toHaveLength(1_001);
		expect(results.every((result) => result.requiresIndependentReview)).toBe(
			true,
		);
	});
});

describe("parseGitDiffSummaries", () => {
	it("joins NUL-delimited path statuses to line counts without reading source", () => {
		const stats =
			"5\t2\tapps/web/src/components/lead-card.tsx\0-\t-\tpublic/logo.png\0";
		const statuses =
			"M\0apps/web/src/components/lead-card.tsx\0A\0public/logo.png\0";

		expect(parseGitDiffSummaries(stats, statuses)).toEqual([
			{
				path: "apps/web/src/components/lead-card.tsx",
				status: "modified",
				additions: 5,
				deletions: 2,
			},
			{ path: "public/logo.png", status: "added", additions: 0, deletions: 0 },
		]);
	});

	it("rejects mismatched diff metadata", () => {
		expect(() => parseGitDiffSummaries("1\t0\ta.ts\0", "M\0b.ts\0")).toThrow(
			"Numstat path missing from name-status data",
		);
	});
});
