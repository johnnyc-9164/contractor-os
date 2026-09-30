import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
	assertMatchingSha,
	verifyPreviewDeployment,
} from "./preview-deployment";

const EXPECTED_SHA = `9c06ea0${"a".repeat(33)}`;

const input = {
	target: "preview",
	previewUrl: "https://contractoros-git-cos-65-johnnyc.vercel.app/",
	expectedSha: EXPECTED_SHA,
};

function health(sha: string, convex = "ok", environment = "preview") {
	return new Response(JSON.stringify({ sha, convex, environment }), {
		status: 200,
	});
}

describe("verifyPreviewDeployment", () => {
	it("passes only when the Preview SHA matches and Convex is healthy", async () => {
		const fetcher = vi.fn(async () => health(EXPECTED_SHA));

		await expect(verifyPreviewDeployment(input, fetcher)).resolves.toEqual({
			target: "preview",
			previewUrl: "https://contractoros-git-cos-65-johnnyc.vercel.app",
			expectedSha: EXPECTED_SHA,
			observedSha: EXPECTED_SHA,
			environment: "preview",
			convex: "ok",
		});
		expect(fetcher).toHaveBeenCalledWith(
			new URL("https://contractoros-git-cos-65-johnnyc.vercel.app/api/health"),
			expect.objectContaining({ redirect: "manual" }),
		);
	});

	it("fails the required stale-SHA fixture with expected and observed output", async () => {
		expect(() => assertMatchingSha("9c06ea0", "abf80e1")).toThrow(
			"Preview SHA mismatch: expected 9c06ea0, observed abf80e1",
		);
	});

	it("fails when the matching Preview reports unhealthy Convex", async () => {
		await expect(
			verifyPreviewDeployment(input, async () => health(EXPECTED_SHA, "error")),
		).rejects.toThrow(
			`Preview ${EXPECTED_SHA} is live, but Convex health is error`,
		);
	});

	it("requires a full commit SHA at the verification boundary", async () => {
		await expect(
			verifyPreviewDeployment({ ...input, expectedSha: "9c06ea0" }),
		).rejects.toThrow("Expected SHA must be the full 40-character commit SHA");
	});

	it("rejects server-reported production even when the URL looks like a Preview", async () => {
		await expect(
			verifyPreviewDeployment(input, async () =>
				health(EXPECTED_SHA, "ok", "production"),
			),
		).rejects.toThrow(
			"Deployment environment must be preview; observed production",
		);
	});

	it("requires the Preview target before making a request", async () => {
		const fetcher = vi.fn();

		await expect(
			verifyPreviewDeployment({ ...input, target: "production" }, fetcher),
		).rejects.toThrow(
			'Deployment target must be preview; received "production"',
		);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("refuses the Contractor OS production URL", async () => {
		await expect(
			verifyPreviewDeployment({
				...input,
				previewUrl: "https://contractoros-ten.vercel.app",
			}),
		).rejects.toThrow(
			"Production URL is not allowed: https://contractoros-ten.vercel.app",
		);
	});

	it("refuses a non-Contractor OS host before making a request", async () => {
		const fetcher = vi.fn();

		await expect(
			verifyPreviewDeployment(
				{
					...input,
					previewUrl: "https://attacker.example",
					protectionBypassSecret: "test-bypass-value",
				},
				fetcher,
			),
		).rejects.toThrow(
			"Preview URL must use a Contractor OS Vercel Preview host; received attacker.example",
		);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("requires both the expected SHA and Preview URL", async () => {
		await expect(
			verifyPreviewDeployment({ ...input, expectedSha: "" }),
		).rejects.toThrow("Expected SHA is required");
		await expect(
			verifyPreviewDeployment({ ...input, previewUrl: "" }),
		).rejects.toThrow("Preview URL is required");
	});
});

describe("deployment workflow integration", () => {
	it("retains production CD jobs while adding Preview verification", () => {
		const workflow = readFileSync(
			new URL("../../.github/workflows/cd.yml", import.meta.url),
			"utf8",
		);
		expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\[master\]/u);
		expect(workflow).toContain("        options:\n          - preview");
		expect(workflow).not.toContain("          - production");
		expect(workflow).not.toContain("default: production");
		for (const job of [
			"deploy-convex",
			"deploy-vercel",
			"smoke",
			"deploy-marketing",
			"smoke-marketing",
		]) {
			expect(workflow).toContain(
				`  ${job}:\n    if: \${{ github.event_name == 'push' && github.ref == 'refs/heads/master' }}`,
			);
		}
		expect(workflow).toMatch(
			/ {2}verify-preview:\n {4}if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.target == 'preview' \}\}/u,
		);
		expect(workflow).toContain("      deployments: read");
		expect(workflow).toContain(
			'if [[ ! "$PREVIEW_URL" =~ ^https://contractoros-[a-z0-9-]+-johnnyc\\.vercel\\.app/?$ ]]; then',
		);
		expect(workflow).toContain('-f sha="$EXPECTED_SHA"');
		expect(workflow).toContain("-f environment='Preview – contractoros'");
		expect(workflow).toContain('if [ "$status_url" = "$PREVIEW_URL" ]; then');
	});
});

describe("Preview protection bypass", () => {
	it("sends the Vercel bypass secret only to the allowlisted Preview host", async () => {
		const fetcher = vi.fn(async () => health(EXPECTED_SHA));
		await verifyPreviewDeployment(
			{ ...input, protectionBypassSecret: "test-bypass-value" },
			fetcher,
		);
		expect(fetcher).toHaveBeenCalledWith(
			new URL("https://contractoros-git-cos-65-johnnyc.vercel.app/api/health"),
			expect.objectContaining({
				headers: {
					accept: "application/json",
					"x-vercel-protection-bypass": "test-bypass-value",
				},
				redirect: "manual",
			}),
		);
	});

	it("reports a protected Preview without leaking the bypass secret", async () => {
		const fetcher = vi.fn(async () => new Response(null, { status: 302 }));
		await expect(
			verifyPreviewDeployment(
				{ ...input, protectionBypassSecret: "test-bypass-value" },
				fetcher,
			),
		).rejects.toThrow(/Vercel Deployment Protection/u);
	});
});
