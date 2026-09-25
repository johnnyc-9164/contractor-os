import { describe, expect, it } from "vitest";
import { isProtectedRoute } from "./proxy";

describe("isProtectedRoute", () => {
	it.each([
		"/dashboard",
		"/dashboard/jobs",
		"/leads",
		"/leads/abc123",
		// Hypothetical future (app) routes: guarded without any guard change.
		"/jobs",
		"/jobs/abc123",
		"/invoices",
		"/contracts/new",
	])("protects %s", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(true);
	});

	it.each([
		"/",
		"/no-access",
		"/api/health",
		"/api",
		"/trpc/anything",
		"/__clerk/handshake",
	])("leaves %s public", (pathname) => {
		expect(isProtectedRoute(pathname)).toBe(false);
	});
});
