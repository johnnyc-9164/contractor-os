import { getFunctionName } from "convex/server";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
	leads: undefined as
		| undefined
		| {
				page: {
					id: string;
					identifier: string;
					title: string | null;
					state: string;
					revision: number;
					updatedAt: number | null | undefined;
				}[];
				isDone: boolean;
				continueCursor: string;
		  },
	queries: [] as { name: string; args: unknown }[],
}));

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
	useQuery: (query: Parameters<typeof getFunctionName>[0], args: unknown) => {
		const name = getFunctionName(query);
		fixture.queries.push({ name, args });
		if (name === "backend:listJobs") return { page: [] };
		if (name !== "backend:listLeads")
			throw new Error(`Unexpected query: ${name}`);
		return fixture.leads;
	},
}));

import {
	S37DashboardContent,
	type S37Props,
} from "../../components/paint-os/screens/S37";
import Dashboard from "./page";

function renderTable() {
	const html = renderToStaticMarkup(createElement(Dashboard));
	const table = html.match(
		/<table[^>]*aria-label="Recent leads"[^>]*>.*?<\/table>/,
	)?.[0];
	expect(table).toBeDefined();
	return { html, table: table ?? "" };
}

beforeEach(() => {
	fixture.queries = [];
	fixture.leads = {
		page: [
			{
				id: "database-id",
				identifier: "lead/42 ?#",
				title: "Kitchen repaint",
				state: "scope_in_progress",
				revision: 3,
				updatedAt: Date.UTC(2026, 9, 1, 8, 15),
			},
			{
				id: "other-database-id",
				identifier: "lead-43",
				title: null,
				state: "Awaiting permit",
				revision: 1,
				updatedAt: 0,
			},
		],
		isDone: false,
		continueCursor: "next-page",
	};
});

describe("dashboard Recent Leads table", () => {
	it("renders truthful aligned columns under the existing single section heading", () => {
		const { html, table } = renderTable();
		const columns = [
			...table.matchAll(/<th\b[^>]*scope="col"[^>]*>(.*?)<\/th>/g),
		].map((match) => match[1]);
		expect(columns).toEqual(["Lead", "Stage", "Updated", "Action"]);
		expect((html.match(/>Recent Leads<\//g) ?? []).length).toBe(1);
		expect(html).not.toContain("Leads (2)");
		expect(table).toContain("Kitchen repaint");
		expect(table).toContain("lead/42 ?#");
		expect(table).toContain("Scope In Progress");
		expect(table).toContain("Awaiting permit");
		expect(table).toContain('data-slot="badge"');
		for (const unavailable of [
			"Client Name",
			"Project Type",
			"Date Added",
			"Est. Value",
			"Owner",
			"Eleanor Shellstrop",
			"$4,500",
		])
			expect(table).not.toContain(unavailable);
	});

	it("keeps native title and explicitly named detail links on encoded identifiers", () => {
		const { html, table } = renderTable();
		expect(table).toMatch(
			/<a[^>]*href="\/leads\/lead%2F42%20%3F%23"[^>]*>Kitchen repaint<\/a>/,
		);
		expect(table).toMatch(
			/<a(?=[^>]*href="\/leads\/lead%2F42%20%3F%23")(?=[^>]*aria-label="Open details for Kitchen repaint")[^>]*>Open details<\/a>/,
		);
		expect(table).toMatch(/<a[^>]*href="\/leads\/lead-43"[^>]*>lead-43<\/a>/);
		expect(table).not.toContain('href="/leads/database-id"');
		expect(html).toMatch(
			/<a(?=[^>]*href="\/leads")(?=[^>]*data-paintpro-action="s37:view-all")[^>]*>/,
		);
	});

	it.each(["__proto__", "constructor", "toString"])(
		"keeps the unknown stage %s as literal text",
		(state) => {
			if (fixture.leads) fixture.leads.page[0].state = state;
			const { table } = renderTable();
			expect(table).toMatch(
				new RegExp(`<span[^>]*data-slot="badge"[^>]*>${state}</span>`),
			);
		},
	);

	it("renders real update times consistently, including the epoch", () => {
		const { table } = renderTable();
		expect(table).toContain(
			'<time dateTime="2026-10-01T08:15:00.000Z">Oct 1, 2026, 8:15 AM UTC</time>',
		);
		expect(table).toContain(
			'<time dateTime="1970-01-01T00:00:00.000Z">Jan 1, 1970, 12:00 AM UTC</time>',
		);
	});

	it("bounds and wraps long unbroken titles and stage labels inside their columns", () => {
		const title = "LongLeadTitle".repeat(30);
		const state = "LongUnknownStage".repeat(30);
		if (fixture.leads) {
			fixture.leads.page[0].title = title;
			fixture.leads.page[0].state = state;
		}
		const { table } = renderTable();
		const link = table.match(
			/<a[^>]*href="\/leads\/lead%2F42%20%3F%23"[^>]*>/,
		)?.[0];
		const badge = table.match(/<span[^>]*data-slot="badge"[^>]*>/)?.[0];
		for (const element of [link, badge]) {
			expect(element).toContain("max-w-full");
			expect(element).toContain("wrap-anywhere");
		}
		expect(table).toContain(title);
		expect(table).toContain(state);
	});

	it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 8.65e15])(
		"shows unavailable instead of crashing on invalid update timestamp %s",
		(timestamp) => {
			if (fixture.leads) fixture.leads.page[0].updatedAt = timestamp;
			const { table } = renderTable();
			expect(table).toContain("Not available");
			expect(table).not.toContain("Invalid Date");
		},
	);

	it.each([null, ""])("uses identifier when title is %s", (title) => {
		if (fixture.leads) fixture.leads.page[0].title = title;
		const { table } = renderTable();
		expect(table).toMatch(
			/<a[^>]*href="\/leads\/lead%2F42%20%3F%23"[^>]*>lead\/42 \?#<\/a>/,
		);
		expect(table).toContain('aria-label="Open details for lead/42 ?#"');
	});

	it("retains the same first-page lead query and does not fetch richer records", () => {
		renderTable();
		expect(fixture.queries).toEqual([
			{
				name: "backend:listLeads",
				args: { paginationOpts: { numItems: 20, cursor: null } },
			},
			{
				name: "backend:listJobs",
				args: { paginationOpts: { numItems: 20, cursor: null } },
			},
		]);
	});

	it.each(["loading", "empty"])(
		"keeps the %s state inside the same table without source demo records",
		(state) => {
			if (state === "loading") fixture.leads = undefined;
			else if (fixture.leads) fixture.leads.page = [];
			const { table } = renderTable();
			expect(table).toContain('colSpan="4"');
			expect(table).toContain('role="status"');
			expect(table).toContain(
				state === "loading" ? "Loading leads..." : "No leads yet.",
			);
			expect(table).not.toContain("Kitchen repaint");
			expect(table).not.toContain("Eleanor Shellstrop");
		},
	);

	it("removes the live slot's padding and outer scroller without changing the standalone fallback", () => {
		const live = renderToStaticMarkup(
			createElement<S37Props>(S37DashboardContent, {
				slots: { "records-table": createElement("span", null, "live records") },
			}),
		);
		expect(live).toMatch(
			/<div data-slot="card-content" class="[^"]*p-0[^"]*"><div class="[^"]*min-w-0[^"]*">/,
		);
		const source = renderToStaticMarkup(createElement(S37DashboardContent));
		expect(source).toContain(
			'class="flex flex-col gap-4 p-6"><div class="pp:w-full pp:overflow-x-auto">',
		);
		expect(source).toContain("Eleanor Shellstrop");
	});
});
