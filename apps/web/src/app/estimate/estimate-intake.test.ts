import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreparedHandoff } from "./estimate-intake";

describe("prepared estimate email handoff", () => {
	it("renders a native link with the exact mailto target and no button role", () => {
		const href = "mailto:?subject=Project%20brief&body=Details";
		const html = renderToStaticMarkup(
			createElement(PreparedHandoff, { href, onEdit: () => undefined }),
		);
		const link = html.match(/<a\b[^>]*>/)?.[0];

		expect(link).toBeDefined();
		expect(link).toContain(
			'href="mailto:?subject=Project%20brief&amp;body=Details"',
		);
		expect(link).not.toMatch(/\brole="button"/);
		expect(link).not.toMatch(/\btype="button"/);
		expect(link).toContain("bg-primary");
		expect(html).toContain("Open email draft");
	});
});
