import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	DashboardPresentation,
	LeadWorkspacePresentation,
	QuotePresentation,
} from "./presentations";

const root = resolve(import.meta.dirname, "../../../../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("existing-route UI assembly boundary", () => {
	it("adopts the supplied screen content on the existing business routes", () => {
		for (const [route, screen] of [
			["dashboard", "DashboardPresentation"],
			["(app)/pipeline", "LeadWorkspacePresentation"],
			["(app)/leads", "LeadWorkspacePresentation"],
			["(app)/leads/[id]", "LeadWorkspacePresentation"],
			["(app)/quotes/new", "QuotePresentation"],
		]) {
			expect(source(`apps/web/src/app/${route}/page.tsx`)).toContain(screen);
		}
	});

	it("keeps presentation components independent from backend and auth", () => {
		const path = "apps/web/src/components/paint-os/presentations.tsx";
		expect(existsSync(resolve(root, path))).toBe(true);
		if (!existsSync(resolve(root, path))) return;
		const text = source(path);
		expect(text).not.toMatch(/convex\/|@clerk|useQuery|useMutation|useAction/);
		expect(text).toContain("Static design examples");
	});

	it("identifies design examples and leaves every unbound dashboard action disabled", () => {
		const html = renderToStaticMarkup(
			createElement(DashboardPresentation, {
				records: createElement("p", null, "Existing lead query content"),
				children: createElement("p", null, "Existing job and form content"),
			}),
		);
		expect(html).toContain("Static design examples");
		expect(html).toContain("not your business data");
		expect(html).toContain("Existing lead query content");
		expect(html).toContain("Existing job and form content");
		expect(html).not.toContain("Eleanor Shellstrop");
		const sourceActions = [
			...html.matchAll(/<button[^>]*data-paintpro-action[^>]*>/g),
		];
		expect(sourceActions.length).toBeGreaterThan(0);
		for (const action of sourceActions) expect(action[0]).toContain("disabled");
	});

	it("replaces all sample pipeline records and details with existing route content", () => {
		const html = renderToStaticMarkup(
			createElement(LeadWorkspacePresentation, {
				title: "Leads Pipeline",
				children: createElement("p", null, "Existing live pipeline"),
			}),
		);
		expect(html).toContain('data-paintpro-screen="S36"');
		expect(html).toContain("Existing live pipeline");
		expect(html).not.toContain("Sarah Jenkins");
		expect(html).not.toContain("Elena Rodriguez");
		expect(html).not.toContain("Convert to Quote");
		expect(html).toContain('href="/leads"');
		expect(html).toContain('href="/pipeline"');
	});

	it("preserves the quote workflow slot without rendering sample pricing or sending controls", () => {
		const html = renderToStaticMarkup(
			createElement(QuotePresentation, {
				children: createElement("p", null, "Existing guarded quote workflow"),
			}),
		);
		expect(html).toContain('data-paintpro-screen="S12"');
		expect(html).toContain("Existing guarded quote workflow");
		expect(html).not.toContain("s12:send-to-client");
		expect(html).not.toContain("s12:save-as-draft");
		expect(html).not.toContain("s12:number");
	});
});
