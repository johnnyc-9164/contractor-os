import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
	assertMatchingSha,
	assertSignedOutRedirect,
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
			/ {2}verify-preview:\n {4}if: \$\{\{ github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/master' && inputs\.target == 'preview' \}\}/u,
		);
		expect(workflow).toContain("    environment: preview-certification");
		expect(workflow).toMatch(/ref: \$\{\{ github\.sha \}\}/u);
		expect(workflow).toContain("          persist-credentials: false");
		expect(workflow).toMatch(
			/VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_PREVIEW_CERT_BYPASS_SECRET \}\}/u,
		);
		expect(workflow).not.toMatch(/secrets\.VERCEL_AUTOMATION_BYPASS_SECRET/u);
		expect(workflow).toContain("      pr_number:");
		expect(workflow).toContain(
			'gh api --method GET "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER"',
		);
		const productionSmoke = workflow.split("  deploy-marketing:")[0];
		const previewGate = workflow.split("  verify-preview:")[1];
		expect(productionSmoke).toContain('case "$location" in');
		expect(previewGate).toContain("--assert-signed-out-redirect");
		expect(previewGate).not.toContain("*clerk.accounts.dev*/handshake*");
		expect(workflow).toContain("      deployments: read");
		expect(workflow).toContain("      pull-requests: read");
		expect(workflow).toContain(
			'if [[ ! "$PREVIEW_URL" =~ ^https://contractoros-[a-z0-9-]+-johnnyc\\.vercel\\.app/?$ ]]; then',
		);
		expect(workflow).toContain('-f sha="$EXPECTED_SHA"');
		expect(workflow).toContain("-f environment='Preview – contractoros'");
		expect(workflow).toContain(
			`if [ "\${status_url%/}" = "\${PREVIEW_URL%/}" ]; then`,
		);
	});
});

describe("signed-out redirect boundary", () => {
	const preview = "https://contractoros-git-cos-65-johnnyc.vercel.app";
	it("accepts only Preview sign-in and the exact observed Clerk handshake", () => {
		expect(() =>
			assertSignedOutRedirect(307, `${preview}/sign-in`, preview),
		).not.toThrow();
		expect(() =>
			assertSignedOutRedirect(
				307,
				"/sign-in?redirect_url=%2Fdashboard",
				preview,
			),
		).not.toThrow();
		expect(() =>
			assertSignedOutRedirect(
				307,
				"https://ideal-bullfrog-9796.clerk.accounts.dev/v1/client/handshake?__clerk_hs_reason=dev-browser-missing",
				preview,
			),
		).not.toThrow();
	});
	it.each([
		"https://evil.example/sign-in",
		"https://ideal-bullfrog-9796.clerk.accounts.dev.evil.example/v1/client/handshake?__clerk_hs_reason=dev-browser-missing",
		"https://other.clerk.accounts.dev/v1/client/handshake?__clerk_hs_reason=dev-browser-missing",
		"https://ideal-bullfrog-9796.clerk.accounts.dev/other?__clerk_hs_reason=dev-browser-missing",
		"https://ideal-bullfrog-9796.clerk.accounts.dev/v1/client/handshake?__clerk_hs_reason=other",
		"https://contractoros-git-cos-65-johnnyc.vercel.app.evil.example/sign-in",
	])("rejects external or lookalike destination %s", (location) => {
		expect(() => assertSignedOutRedirect(307, location, preview)).toThrow(
			"Signed-out dashboard redirect target is not trusted",
		);
	});
	it("requires an actual redirect status and destination", () => {
		expect(() =>
			assertSignedOutRedirect(200, `${preview}/sign-in`, preview),
		).toThrow("Signed-out dashboard did not redirect");
		expect(() => assertSignedOutRedirect(307, "", preview)).toThrow(
			"Signed-out dashboard redirect target is not trusted",
		);
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
