import { getFunctionName } from "convex/server";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
	useUser: () => ({ user: { fullName: "Test operator" } }),
	UserButton: () => null,
	SignInButton: () => null,
}));

vi.mock("convex/react", () => ({
	Authenticated: ({ children }: { children: ReactNode }) => children,
	Unauthenticated: () => null,
	AuthLoading: () => null,
	useMutation: () => vi.fn(),
	useQuery: (query: Parameters<typeof getFunctionName>[0]) => {
		const name = getFunctionName(query);
		if (name === "backend:listJobs") return { page: [] };
		if (name !== "backend:listLeads")
			throw new Error(`Unexpected query: ${name}`);
		return {
			isDone: true,
			continueCursor: "",
			page: [
				{
					id: "database-id",
					identifier: "lead/42 ?#",
					title: "Kitchen repaint",
					state: "Prospect",
				},
				{
					id: "other-database-id",
					identifier: "lead-43",
					title: null,
					state: "Prospect",
				},
			],
		};
	},
}));

import Dashboard from "./page";

describe("dashboard lead navigation", () => {
	it("links queried lead titles by encoded identifier, never the database id", () => {
		const html = renderToStaticMarkup(createElement(Dashboard));
		expect(html).toMatch(
			/<a[^>]*href="\/leads\/lead%2F42%20%3F%23"[^>]*>Kitchen repaint<\/a>/,
		);
		expect(html).not.toContain('href="/leads/database-id"');
	});

	it("keeps untitled queried leads reachable by their identifier", () => {
		const html = renderToStaticMarkup(createElement(Dashboard));
		expect(html).toMatch(/<a[^>]*href="\/leads\/lead-43"[^>]*>lead-43<\/a>/);
	});
});
