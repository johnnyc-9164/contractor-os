import { describe, expect, it, vi } from "vitest";
import { verifyPreviewDeployment } from "./preview-deployment";

const input = {
	target: "preview",
	previewUrl: "https://contractoros-git-cos-65.example.vercel.app/",
	expectedSha: "9c06ea0",
};

function health(sha: string, convex = "ok") {
	return new Response(JSON.stringify({ sha, convex }), { status: 200 });
}

describe("verifyPreviewDeployment", () => {
	it("passes only when the Preview SHA matches and Convex is healthy", async () => {
		const fetcher = vi.fn(async () => health("9c06ea0"));

		await expect(verifyPreviewDeployment(input, fetcher)).resolves.toEqual({
			target: "preview",
			previewUrl: "https://contractoros-git-cos-65.example.vercel.app",
			expectedSha: "9c06ea0",
			observedSha: "9c06ea0",
			convex: "ok",
		});
		expect(fetcher).toHaveBeenCalledWith(
			new URL(
				"https://contractoros-git-cos-65.example.vercel.app/api/health",
			),
			expect.objectContaining({ redirect: "error" }),
		);
	});

	it("fails the required stale-SHA fixture with expected and observed output", async () => {
		await expect(
			verifyPreviewDeployment(input, async () => health("abf80e1")),
		).rejects.toThrow(
			"Preview SHA mismatch: expected 9c06ea0, observed abf80e1",
		);
	});

	it("fails when the matching Preview reports unhealthy Convex", async () => {
		await expect(
			verifyPreviewDeployment(input, async () => health("9c06ea0", "error")),
		).rejects.toThrow(
			"Preview 9c06ea0 is live, but Convex health is error",
		);
	});

	it("requires the Preview target before making a request", async () => {
		const fetcher = vi.fn();

		await expect(
			verifyPreviewDeployment({ ...input, target: "production" }, fetcher),
		).rejects.toThrow('Deployment target must be preview; received "production"');
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

	it("requires both the expected SHA and Preview URL", async () => {
		await expect(
			verifyPreviewDeployment({ ...input, expectedSha: "" }),
		).rejects.toThrow("Expected SHA is required");
		await expect(
			verifyPreviewDeployment({ ...input, previewUrl: "" }),
		).rejects.toThrow("Preview URL is required");
	});
});
