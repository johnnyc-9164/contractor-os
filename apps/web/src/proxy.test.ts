import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const getUser = vi.fn(async (_userId: string) => ({
		primaryEmailAddressId: "primary",
		emailAddresses: [{ id: "primary", emailAddress: "owner@example.com" }],
	}));

	return {
		clerkMiddleware: vi.fn((callback: unknown) => callback),
		clerkClient: vi.fn(async () => ({ users: { getUser } })),
		getUser,
		redirect: vi.fn((url: URL) => ({
			type: "redirect",
			location: url.toString(),
		})),
	};
});

vi.mock("@clerk/nextjs/server", () => ({
	clerkMiddleware: mocks.clerkMiddleware,
	clerkClient: mocks.clerkClient,
}));

vi.mock("next/server", () => ({
	NextResponse: { redirect: mocks.redirect },
}));

import { isAllowlistExempt, isProtectedRoute, default as proxy } from "./proxy";

type MockAuth = (() => Promise<{ userId: string | null }>) & {
	protect: ReturnType<typeof vi.fn>;
};

type ProxyCallback = (
	auth: MockAuth,
	request: { nextUrl: { pathname: string; clone: () => URL } },
) => Promise<unknown>;

const registrationArgs = mocks.clerkMiddleware.mock.calls[0];
const callback = registrationArgs?.[0] as ProxyCallback;
const originalAdminEmails = process.env.ADMIN_EMAILS;

async function runProxy(pathname: string, userId: string | null) {
	const auth = Object.assign(
		vi.fn(async () => ({ userId })),
		{
			protect: vi.fn(async () => undefined),
		},
	);
	const url = new URL(pathname, "https://contractor.example");
	const result = await callback(auth, {
		nextUrl: { pathname: url.pathname, clone: () => new URL(url) },
	});
	return { auth, result };
}

beforeEach(() => {
	vi.clearAllMocks();
	process.env.ADMIN_EMAILS = "Owner@Example.com";
	mocks.getUser.mockResolvedValue({
		primaryEmailAddressId: "primary",
		emailAddresses: [{ id: "primary", emailAddress: "owner@example.com" }],
	});
});

afterAll(() => {
	if (originalAdminEmails === undefined) {
		delete process.env.ADMIN_EMAILS;
	} else {
		process.env.ADMIN_EMAILS = originalAdminEmails;
	}
});

describe("isProtectedRoute", () => {
	it.each([
		"/dashboard",
		"/dashboard/jobs",
		"/leads",
		"/leads/abc123",
		"/customers",
		"/customers/customer-123",
		"/jobs",
		"/jobs/job-123",
		"/pipeline",
		"/pipeline/job-123",
		"/quotes/new",
		"/quotes/new/step-2",
	])("protects %s", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(true);
	});

	it.each([
		"/",
		"/sign-in",
		"/sign-in/sso-callback",
		"/no-access",
		"/estimate",
		"/estimate/step-2",
		"/dashboarding",
		"/customers-report",
		"/jobs-report",
		"/estimated",
		"/pipeline-report",
		"/quotes-new",
		"/api/health",
	])("leaves %s public", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(false);
	});
});

describe("public estimate intake", () => {
	it.each(["/estimate", "/estimate/step-2", "/estimate/review/details"])(
		"exempts %s from the signed-in admin allowlist",
		(pathname) => {
			expect(isProtectedRoute(pathname)).toBe(false);
			expect(isAllowlistExempt(pathname)).toBe(true);
		},
	);

	it.each(["/estimated", "/estimate-report", "/customers", "/jobs"])(
		"does not exempt %s from the admin allowlist",
		(pathname) => {
			expect(isAllowlistExempt(pathname)).toBe(false);
		},
	);
});

describe("Clerk proxy callback", () => {
	it("registers a middleware callback with the existing sign-in route", () => {
		expect(proxy).toBe(callback);
		expect(registrationArgs).toEqual([
			expect.any(Function),
			{ signInUrl: "/sign-in" },
		]);
	});

	it.each(["/customers", "/jobs/job-123", "/pipeline", "/quotes/new"])(
		"requires Clerk protection for signed-out %s",
		async (pathname) => {
			const { auth, result } = await runProxy(pathname, null);
			expect(auth.protect).toHaveBeenCalledOnce();
			expect(auth).toHaveBeenCalledOnce();
			expect(mocks.clerkClient).not.toHaveBeenCalled();
			expect(mocks.redirect).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		},
	);

	it.each(["/customers", "/jobs", "/pipeline", "/quotes/new"])(
		"redirects signed-in nonadmins from %s",
		async (pathname) => {
			mocks.getUser.mockResolvedValue({
				primaryEmailAddressId: "primary",
				emailAddresses: [
					{ id: "primary", emailAddress: "outsider@example.com" },
				],
			});
			const { auth, result } = await runProxy(pathname, "user_outsider");
			expect(auth.protect).toHaveBeenCalledOnce();
			expect(mocks.clerkClient).toHaveBeenCalledOnce();
			expect(mocks.getUser).toHaveBeenCalledWith("user_outsider");
			expect(mocks.redirect).toHaveBeenCalledOnce();
			expect(result).toEqual({
				type: "redirect",
				location: "https://contractor.example/not-authorized",
			});
		},
	);

	it.each(["/estimate", "/estimate/step-2"])(
		"does not inspect or redirect a signed-in public intake visitor at %s",
		async (pathname) => {
			const { auth, result } = await runProxy(pathname, "user_outsider");
			expect(auth.protect).not.toHaveBeenCalled();
			expect(auth).not.toHaveBeenCalled();
			expect(mocks.clerkClient).not.toHaveBeenCalled();
			expect(mocks.redirect).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		},
	);

	it.each(["/customers", "/jobs", "/pipeline", "/quotes/new"])(
		"allows an allowlisted admin through %s",
		async (pathname) => {
			const { auth, result } = await runProxy(pathname, "user_owner");
			expect(auth.protect).toHaveBeenCalledOnce();
			expect(mocks.getUser).toHaveBeenCalledWith("user_owner");
			expect(mocks.redirect).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		},
	);

	it.each([
		"/customers-report",
		"/jobs-report",
		"/pipeline-report",
		"/quotes-new",
		"/estimated",
	])("does not protect lookalike %s", async (pathname) => {
		const { auth } = await runProxy(pathname, null);
		expect(auth.protect).not.toHaveBeenCalled();
		expect(mocks.clerkClient).not.toHaveBeenCalled();
		expect(mocks.redirect).not.toHaveBeenCalled();
	});
});
