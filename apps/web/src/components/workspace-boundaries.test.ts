import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./membership-provider", () => ({
	MembershipProvider: () =>
		createElement("p", null, "Membership check required"),
}));

describe("workspace route boundaries", () => {
	it("gates dashboard children through the shared membership provider", async () => {
		const { default: DashboardLayout } = await import(
			"../app/dashboard/layout"
		);
		const html = renderToStaticMarkup(
			createElement(DashboardLayout, {
				children: "Protected dashboard records",
			}),
		);
		expect(html).toContain("Membership check required");
		expect(html).not.toContain("Protected dashboard records");
	});

	it.each(["dashboard", "(app)"])(
		"provides actionable %s query failure UI without exposing diagnostics",
		async (segment) => {
			const { default: RouteError } =
				segment === "dashboard"
					? await import("../app/dashboard/error")
					: await import("../app/(app)/error");
			const html = renderToStaticMarkup(
				createElement(RouteError, {
					error: new Error("FORBIDDEN: private diagnostic"),
					retry: () => {},
				}),
			);
			expect(html).toContain("Workspace could not load");
			expect(html).toContain("Try again");
			expect(html).toContain("administrator");
			expect(html).not.toContain("private diagnostic");
		},
	);
});
