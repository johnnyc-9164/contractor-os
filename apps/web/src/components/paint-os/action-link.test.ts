import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { S37DashboardContent, type S37Props } from "./screens/S37";

describe("dashboard action link semantics", () => {
	it("renders a native button for a handler without a navigation destination", () => {
		const html = renderToStaticMarkup(
			createElement<S37Props>(S37DashboardContent, {
				handlers: { "s37:view-all-actions": () => {} },
			}),
		);
		const action = html.match(
			/<(\w+)[^>]*data-paintpro-action="s37:view-all-actions"[^>]*>/,
		);
		expect(action?.[1]).toBe("button");
		expect(action?.[0]).toContain('type="button"');
		expect(action?.[0]).not.toContain("disabled");
	});

	it("preserves a supplied navigation destination as a link", () => {
		const html = renderToStaticMarkup(
			createElement<S37Props>(S37DashboardContent, {
				links: { "s37:view-all-actions": "/leads" },
			}),
		);
		const action = html.match(
			/<(\w+)[^>]*data-paintpro-action="s37:view-all-actions"[^>]*>/,
		);
		expect(action?.[1]).toBe("a");
		expect(action?.[0]).toContain('href="/leads"');
	});
});
