import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	clerkAuth: vi.fn(),
	convexAuth: vi.fn(),
	pathname: vi.fn(() => "/dashboard"),
	query: vi.fn(),
	replace: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
	useAuth: mocks.clerkAuth,
	UserButton: () => createElement("span", null, "Account menu"),
}));

vi.mock("convex/react", () => ({
	useConvexAuth: mocks.convexAuth,
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

import { MembershipProvider } from "./membership-provider";

const children = createElement("div", null, "Private");

describe("MembershipProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.clerkAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
		mocks.pathname.mockReturnValue("/dashboard");
		mocks.query.mockReturnValue(undefined);
	});

	it.each([
		[
			"Clerk is loading",
			{ isLoaded: false, isSignedIn: undefined },
			{ isLoading: false, isAuthenticated: false },
		],
		[
			"Clerk is signed out",
			{ isLoaded: true, isSignedIn: false },
			{ isLoading: false, isAuthenticated: false },
		],
		[
			"Convex authentication is loading",
			{ isLoaded: true, isSignedIn: true },
			{ isLoading: true, isAuthenticated: false },
		],
	])("skips membership while %s", (_label, clerk, convex) => {
		mocks.clerkAuth.mockReturnValue(clerk);
		mocks.convexAuth.mockReturnValue(convex);

		expect(MembershipProvider({ children })).toBeNull();
		expect(mocks.query).toHaveBeenCalledOnce();
		expect(mocks.query.mock.calls[0]?.[1]).toBe("skip");
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it("shows a retry and account action for a signed-in user when Convex authentication has failed", () => {
		mocks.convexAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: false,
		});

		const result = MembershipProvider({ children });

		expect(mocks.query.mock.calls[0]?.[1]).toBe("skip");
		expect(mocks.replace).not.toHaveBeenCalled();
		expect(result).toMatchObject({ type: "main", props: { role: "alert" } });
		expect(JSON.stringify(result)).toContain("Unable to verify access");
		expect(JSON.stringify(result)).toContain("/dashboard");
	});

	it("waits for the membership query before rendering or redirecting", () => {
		mocks.convexAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});

		expect(MembershipProvider({ children })).toBeNull();
		expect(mocks.query.mock.calls[0]?.[1]).toEqual({});
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it("renders children for an enabled authenticated membership", () => {
		mocks.convexAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});
		mocks.query.mockReturnValue({ enabled: true, role: "operator" });

		const result = MembershipProvider({ children });

		expect(mocks.query.mock.calls[0]?.[1]).toEqual({});
		expect(result).not.toBeNull();
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it.each([null, { enabled: false, role: "viewer" }])(
		"redirects an authenticated user whose membership is %j",
		(membership) => {
			mocks.convexAuth.mockReturnValue({
				isLoading: false,
				isAuthenticated: true,
			});
			mocks.query.mockReturnValue(membership);

			expect(MembershipProvider({ children })).toBeNull();
			expect(mocks.replace).toHaveBeenCalledWith("/no-access");
		},
	);
});
