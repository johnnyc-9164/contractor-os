import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	auth: { isLoading: false, isAuthenticated: true, isRefreshing: false },
	membership: undefined as
		| undefined
		| Error
		| { role: "viewer" | "operator" | "admin" | null; enabled: boolean },
	isSignedIn: true,
}));

vi.mock("convex/react", () => ({
	useConvexAuth: () => state.auth,
	useQuery: (_query: unknown, args: unknown) => {
		if (args === "skip") return undefined;
		if (
			state.auth.isLoading ||
			state.auth.isRefreshing ||
			!state.auth.isAuthenticated
		) {
			throw new Error("Membership query started before Convex authentication");
		}
		if (state.membership instanceof Error) throw state.membership;
		return state.membership;
	},
	useQueries: (queries: Record<string, unknown>) => {
		if (Object.keys(queries).length === 0) return {};
		if (
			state.auth.isLoading ||
			state.auth.isRefreshing ||
			!state.auth.isAuthenticated
		) {
			throw new Error("Membership query started before Convex authentication");
		}
		return { membership: state.membership };
	},
}));
vi.mock("@clerk/nextjs", () => ({
	useAuth: () => ({ isSignedIn: state.isSignedIn }),
	UserButton: () => createElement("button", { type: "button" }, "Account"),
	SignInButton: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next/navigation", () => ({
	usePathname: () => "/leads",
	useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("./mode-toggle", () => ({ ModeToggle: () => null }));

import Header from "./header";
import { MembershipProvider, useMembership } from "./membership-provider";

function WorkspaceRecords() {
	const { role, enabled, isLoading } = useMembership();
	return createElement(
		"p",
		null,
		`Protected records:${role}:${enabled}:${isLoading}`,
	);
}
const renderWorkspace = () =>
	renderToStaticMarkup(
		createElement(MembershipProvider, {
			children: createElement(WorkspaceRecords),
		}),
	);
const renderHeader = () => renderToStaticMarkup(createElement(Header));

beforeEach(() => {
	state.auth = { isLoading: false, isAuthenticated: true, isRefreshing: false };
	state.membership = undefined;
	state.isSignedIn = true;
});

describe("workspace membership loading", () => {
	it("does not query membership or render records while Convex auth is loading", () => {
		state.auth = {
			isLoading: true,
			isAuthenticated: false,
			isRefreshing: false,
		};
		const html = renderWorkspace();
		expect(html).toContain("Checking your session");
		expect(html).toContain('role="status"');
		expect(html).not.toContain("Protected records");
		expect(renderHeader()).not.toContain('href="/dashboard"');
	});

	it("does not query membership after auth finishes without an identity", () => {
		state.auth = {
			isLoading: false,
			isAuthenticated: false,
			isRefreshing: false,
		};
		const html = renderWorkspace();
		expect(html).toContain("Workspace sign-in required");
		expect(html).toContain("Sign in");
		expect(html).not.toContain("Protected records");
		expect(renderHeader()).not.toContain('href="/dashboard"');
	});

	it("shows membership loading without mounting record queries", () => {
		const html = renderWorkspace();
		expect(html).toContain("Checking workspace access");
		expect(html).not.toContain("Protected records");
	});

	it.each([null, "viewer", "operator", "admin"] as const)(
		"shows no access and no privileged navigation for a disabled %s membership",
		(role) => {
			state.membership = { role, enabled: false };
			const html = renderWorkspace();
			expect(html).toContain("No workspace access");
			expect(html).not.toContain("Protected records");
			expect(renderHeader()).not.toContain('href="/dashboard"');
		},
	);

	it.each(["viewer", "operator", "admin"] as const)(
		"preserves an enabled %s role",
		(role) => {
			state.membership = { role, enabled: true };
			expect(renderWorkspace()).toContain(
				`Protected records:${role}:true:false`,
			);
			expect(renderHeader().includes('href="/dashboard"')).toBe(
				role !== "viewer",
			);
		},
	);

	it.each(["Unauthenticated", "FORBIDDEN", "Network unavailable"])(
		"shows a safe error instead of crashing on %s",
		(message) => {
			state.membership = new Error(`${message}: private diagnostic`);
			const html = renderWorkspace();
			expect(html).toContain("Workspace could not load");
			expect(html).toContain("Reload page");
			expect(html).not.toContain("Protected records");
			expect(html).not.toContain("private diagnostic");
			expect(renderHeader()).not.toContain('href="/dashboard"');
		},
	);

	it("hides records and skips membership while a rejected token is refreshing", () => {
		state.membership = { role: "admin", enabled: true };
		state.auth.isRefreshing = true;
		expect(renderWorkspace()).toContain("Checking your session");
		expect(renderWorkspace()).not.toContain("Protected records");
		expect(renderHeader()).not.toContain('href="/dashboard"');
	});

	it("never exposes stale membership after losing authentication", () => {
		state.membership = { role: "admin", enabled: true };
		state.auth = {
			isLoading: false,
			isAuthenticated: false,
			isRefreshing: false,
		};
		expect(renderWorkspace()).not.toContain("Protected records");
		expect(renderHeader()).not.toContain('href="/dashboard"');
	});
});
