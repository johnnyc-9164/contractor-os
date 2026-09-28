import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	clerkAuth: vi.fn(),
	convexAuth: vi.fn(),
	query: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
	SignInButton: ({ children }: { children: React.ReactNode }) => children,
	UserButton: () => createElement("div"),
	useAuth: mocks.clerkAuth,
}));

vi.mock("convex/react", () => ({
	useConvexAuth: mocks.convexAuth,
	useQuery: mocks.query,
}));

vi.mock("next/link", () => ({
	default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@contractor-os/ui/components/button", () => ({
	Button: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./mode-toggle", () => ({
	ModeToggle: () => createElement("div"),
}));

import Header, { canSeeAdminActions } from "./header";

describe("Header membership lookup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.query.mockReturnValue(undefined);
	});

	it.each([
		[
			"Clerk is signed out",
			false,
			{ isLoading: false, isAuthenticated: false },
			"skip",
		],
		[
			"Clerk is signed in while Convex authentication is loading",
			true,
			{ isLoading: true, isAuthenticated: false },
			"skip",
		],
		[
			"Clerk is signed in but Convex is signed out",
			true,
			{ isLoading: false, isAuthenticated: false },
			"skip",
		],
		[
			"Clerk and Convex are authenticated",
			true,
			{ isLoading: false, isAuthenticated: true },
			{},
		],
	] as const)(
		"passes the expected query argument when %s",
		(_label, isSignedIn, convexAuth, expectedArgument) => {
			mocks.clerkAuth.mockReturnValue({ isSignedIn });
			mocks.convexAuth.mockReturnValue(convexAuth);

			Header();

			expect(mocks.query).toHaveBeenCalledOnce();
			expect(mocks.query.mock.calls[0]?.[1]).toEqual(expectedArgument);
		},
	);
});

describe("canSeeAdminActions", () => {
	it("hides admin-gated actions from viewers and missing memberships", () => {
		expect(canSeeAdminActions("viewer")).toBe(false);
		expect(canSeeAdminActions(null)).toBe(false);
	});

	it("shows admin-gated actions to operators and admins", () => {
		expect(canSeeAdminActions("operator")).toBe(true);
		expect(canSeeAdminActions("admin")).toBe(true);
	});
});
