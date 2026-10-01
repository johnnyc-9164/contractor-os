import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	DashboardPresentation,
	LeadWorkspacePresentation,
} from "./presentations";

describe("existing workspace route navigation", () => {
	it("makes the dashboard View All action a native link to the live leads list", () => {
		const html = renderToStaticMarkup(
			createElement(DashboardPresentation, { records: null, children: null }),
		);
		const action = html.match(
			/<(\w+)[^>]*data-paintpro-action="s37:view-all"[^>]*>/,
		);
		expect(action?.[1]).toBe("a");
		expect(action?.[0]).toContain('href="/leads"');
		expect(action?.[0]).not.toContain("disabled");
	});

	it.each(["dashboard", "lead workspace"])(
		"links all existing workspace views from the %s",
		(surface) => {
			const html = renderToStaticMarkup(
				surface === "dashboard"
					? createElement(DashboardPresentation, {
							records: null,
							children: null,
						})
					: createElement(LeadWorkspacePresentation, {
							title: "Leads",
							children: null,
						}),
			);
			const nav = html.match(
				/<nav[^>]*aria-label="Workspace views"[^>]*>(.*?)<\/nav>/,
			)?.[1];
			expect(nav).toBeDefined();
			for (const route of ["/dashboard", "/leads", "/pipeline"]) {
				expect(nav).toContain(`href="${route}"`);
			}
		},
	);
});
