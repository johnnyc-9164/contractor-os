import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	pathname: vi.fn(() => "/dashboard"),
	query: vi.fn(),
	replace: vi.fn(),
}));

vi.mock("convex/react", () => ({
	useConvexAuth: mocks.auth,
	useQuery: mocks.query,
}));

vi.mock("next/navigation", () => ({
	usePathname: mocks.pathname,
	useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useEffect: (effect: () => void) => effect(),
	};
});

import { MembershipProvider } from "./components/membership-provider";
import { isProtectedRoute } from "./proxy";

describe("isProtectedRoute", () => {
	it.each([
		"/dashboard",
		"/dashboard/jobs",
		"/leads",
		"/leads/abc123",
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
		"/dashboarding",
		"/pipeline-report",
		"/quotes-new",
		"/api/health",
	])("leaves %s public", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(false);
	});
});

describe("MembershipProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.pathname.mockReturnValue("/dashboard");
	});

	it.each([
		["authentication is loading", { isLoading: true, isAuthenticated: false }],
		["the visitor is signed out", { isLoading: false, isAuthenticated: false }],
	])("skips membership lookup while %s", (_label, authState) => {
		mocks.auth.mockReturnValue(authState);
		mocks.query.mockReturnValue(undefined);

		expect(
			MembershipProvider({ children: createElement("div", null, "Private") }),
		).toBeNull();
		expect(mocks.query).toHaveBeenCalledOnce();
		expect(mocks.query.mock.calls[0]?.[1]).toBe("skip");
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it("renders children for an enabled authenticated membership", () => {
		mocks.auth.mockReturnValue({ isLoading: false, isAuthenticated: true });
		mocks.query.mockReturnValue({ enabled: true, role: "operator" });

		const result = MembershipProvider({
			children: createElement("div", null, "Private"),
		});

		expect(mocks.query).toHaveBeenCalledOnce();
		expect(mocks.query.mock.calls[0]?.[1]).toEqual({});
		expect(result).not.toBeNull();
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it.each([null, { enabled: false, role: "viewer" }])(
		"redirects an authenticated user whose membership is %j",
		(membership) => {
			mocks.auth.mockReturnValue({
				isLoading: false,
				isAuthenticated: true,
			});
			mocks.query.mockReturnValue(membership);

			expect(
				MembershipProvider({ children: createElement("div", null, "Private") }),
			).toBeNull();
			expect(mocks.replace).toHaveBeenCalledWith("/no-access");
		},
	);
});
