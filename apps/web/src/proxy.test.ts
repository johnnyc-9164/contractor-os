import { describe, expect, it } from "vitest";
import { isAllowlistExempt, isProtectedRoute } from "./proxy";

describe("isProtectedRoute", () => {
	it.each([
		"/dashboard",
		"/dashboard/jobs",
		"/leads",
		"/leads/abc123",
		"/customers",
		"/customers/customer-123",
		"/jobs",
		"/jobs/job-123",
		"/pipeline",
		"/pipeline/job-123",
		"/quotes/new",
		"/quotes/new/step-2",
	])("protects %s", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(true);
	});

	it.each([
		"/",
		"/sign-in",
		"/sign-in/sso-callback",
		"/no-access",
		"/estimate",
		"/estimate/step-2",
		"/dashboarding",
		"/customers-report",
		"/jobs-report",
		"/estimated",
		"/pipeline-report",
		"/quotes-new",
		"/api/health",
	])("leaves %s public", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(false);
	});
});

describe("public estimate intake", () => {
	it.each(["/estimate", "/estimate/step-2", "/estimate/review/details"])(
		"exempts %s from the signed-in admin allowlist",
		(pathname) => {
			expect(isProtectedRoute(pathname)).toBe(false);
			expect(isAllowlistExempt(pathname)).toBe(true);
		},
	);

	it.each(["/estimated", "/estimate-report", "/customers", "/jobs"])(
		"does not exempt %s from the admin allowlist",
		(pathname) => {
			expect(isAllowlistExempt(pathname)).toBe(false);
		},
	);
});
