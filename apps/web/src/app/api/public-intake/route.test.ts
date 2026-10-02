import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mutation } = vi.hoisted(() => ({ mutation: vi.fn() }));

vi.mock("convex/browser", () => ({
	ConvexHttpClient: class {
		mutation = mutation;
	},
}));

import { dynamic, POST } from "./route";

const originalEnv = { ...process.env };

function request(body: unknown, headers: Record<string, string> = {}) {
	return new Request("https://example.test/api/public-intake", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

describe("POST /api/public-intake", () => {
	beforeEach(() => {
		mutation.mockReset();
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
			PUBLIC_INTAKE_BRIDGE_SECRET: "test-bridge-secret",
		};
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("is always dynamic", () => {
		expect(dynamic).toBe("force-dynamic");
	});

	it("uses the server-owned site identifier and strips spoofed authority fields", async () => {
		mutation.mockResolvedValue({ ok: true, received: true });
		const response = await POST(
			request(
				{
					idempotencyKey: "browser-retry-key",
					siteIdentifier: "evil-site",
					tenantId: "evil-tenant",
					actor: "usr_johnny",
					contactName: "Jamie Painter",
					email: "jamie@example.test",
					projectType: "Interior painting",
					location: "Sacramento, CA",
					timeline: "Next month",
					notes: "Two bedrooms and hallway need repainting.",
					consent: true,
					consentPolicyVersion: "homepage-2026-09",
				},
				{ "x-forwarded-for": "203.0.113.10", "user-agent": "vitest" },
			),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, received: true });
		expect(mutation).toHaveBeenCalledTimes(1);
		const [, args] = mutation.mock.calls[0];
		expect(args.bridgeSecret).toBe("test-bridge-secret");
		expect(args.fingerprint).toMatch(/^[a-f0-9]{64}$/);
		expect(args.payload).toMatchObject({
			contactName: "Jamie Painter",
			email: "jamie@example.test",
			projectType: "Interior painting",
			location: "Sacramento, CA",
			consent: true,
			consentPolicyVersion: "homepage-2026-09",
		});
		expect(args.payload).not.toHaveProperty("tenantId");
		expect(args.payload).not.toHaveProperty("actor");
	});

	it("fails closed when server configuration or Convex rejects the request", async () => {
		delete process.env.NEXT_PUBLIC_CONVEX_URL;
		expect((await POST(request({ idempotencyKey: "missing" }))).status).toBe(
			503,
		);
		expect(mutation).not.toHaveBeenCalled();
		process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
		delete process.env.PUBLIC_INTAKE_BRIDGE_SECRET;
		expect(
			(await POST(request({ idempotencyKey: "missing-secret" }))).status,
		).toBe(503);
		expect(mutation).not.toHaveBeenCalled();
		process.env.PUBLIC_INTAKE_BRIDGE_SECRET = "test-bridge-secret";
		mutation.mockResolvedValue({
			ok: false,
			received: false,
			error: { code: "VALIDATION" },
		});
		const rejected = await POST(request({ idempotencyKey: "bad" }));
		expect(rejected.status).toBe(400);
		expect(await rejected.json()).toEqual({
			ok: false,
			received: false,
			error: { code: "VALIDATION" },
		});
	});

	it("returns a minimal unavailable envelope when Convex rejects", async () => {
		mutation.mockRejectedValue(new Error("internal backend details"));
		const response = await POST(request({ idempotencyKey: "convex-down" }));
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
	});
});
