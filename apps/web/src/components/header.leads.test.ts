import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	clerkAuth: vi.fn(),
	convexAuth: vi.fn(),
	query: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
	SignInButton: ({ children }: { children: React.ReactNode }) => children,
	UserButton: () => null,
	useAuth: mocks.clerkAuth,
}));
vi.mock("convex/react", () => ({
	useConvexAuth: mocks.convexAuth,
	useQuery: mocks.query,
}));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		createElement("a", { href }, children),
}));
vi.mock("@contractor-os/ui/components/button", () => ({
	Button: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./mode-toggle", () => ({ ModeToggle: () => null }));

import Header from "./header";

describe("Leads navigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.clerkAuth.mockReturnValue({ isSignedIn: true });
		mocks.convexAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});
		mocks.query.mockReturnValue({ role: "operator" });
	});

	it.each(["operator", "admin"])(
		"links eligible %s members to Leads",
		(role) => {
			mocks.query.mockReturnValue({ role });
			const html = renderToStaticMarkup(createElement(Header));
			expect(html).toContain('<a href="/leads">Leads</a>');
			expect(html).toContain('<a href="/dashboard">Dashboard</a>');
		},
	);

	it.each([
		["signed out", false, false, undefined],
		["Convex loading", true, false, undefined],
		["unbound", true, true, null],
		["viewer", true, true, { role: "viewer" }],
	])(
		"hides Leads from %s visitors",
		(_label, signedIn, authenticated, membership) => {
			mocks.clerkAuth.mockReturnValue({ isSignedIn: signedIn });
			mocks.convexAuth.mockReturnValue({
				isLoading: signedIn && !authenticated,
				isAuthenticated: authenticated,
			});
			mocks.query.mockReturnValue(membership);
			const html = renderToStaticMarkup(createElement(Header));
			expect(html).not.toContain('href="/leads"');
			expect(html).toContain('<a href="/">Home</a>');
		},
	);
});
