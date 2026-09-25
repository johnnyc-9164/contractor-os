import { describe, expect, it } from "vitest";
import { isProtectedRoute } from "./proxy";

describe("isProtectedRoute", () => {
	it.each(["/dashboard", "/dashboard/jobs", "/(app)", "/(app)/jobs"])(
		"protects %s",
		(pathname) => {
			expect(isProtectedRoute(pathname)).toBe(true);
		},
	);

	it.each(["/", "/no-access", "/dashboarding", "/api/health"])(
		"leaves %s public",
		(pathname) => {
			expect(isProtectedRoute(pathname)).toBe(false);
		},
	);
});
