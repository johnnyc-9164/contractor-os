import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("convex/browser", () => ({
	ConvexHttpClient: class {
		query = query;
	},
}));

import { dynamic, GET } from "./route";

const originalEnv = { ...process.env };

describe("GET /api/health", () => {
	beforeEach(() => {
		query.mockReset();
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
		};
		delete process.env.VERCEL_GIT_COMMIT_SHA;
		delete process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("is always dynamic", () => {
		expect(dynamic).toBe("force-dynamic");
	});

	it("prefers the server commit SHA over the public commit SHA", async () => {
		process.env.VERCEL_GIT_COMMIT_SHA = "server-sha";
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = "public-sha";
		query.mockResolvedValue("ok");

		const body = await (await GET()).json();

		expect(body.sha).toBe("server-sha");
	});

	it("falls back to the public commit SHA and then unknown", async () => {
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = "public-sha";
		query.mockResolvedValue("ok");

		expect(await (await GET()).json()).toMatchObject({ sha: "public-sha" });

		delete process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
		expect(await (await GET()).json()).toMatchObject({ sha: "unknown" });
	});

	it("maps a successful Convex query to ok", async () => {
		query.mockResolvedValue({ status: "ok" });

		expect(await (await GET()).json()).toMatchObject({ convex: "ok" });
	});

	it("maps a failed Convex query to error without leaking details", async () => {
		query.mockRejectedValue(new Error("SECRET_DATABASE_CREDENTIAL"));

		const body = await (await GET()).json();

		expect(body.convex).toBe("error");
		expect(Object.keys(body).sort()).toEqual(["convex", "sha", "ts"]);
		expect(JSON.stringify(body)).not.toContain("SECRET_DATABASE_CREDENTIAL");
		expect(new Date(body.ts).toISOString()).toBe(body.ts);
	});
});
