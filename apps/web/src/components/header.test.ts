import { describe, expect, it } from "vitest";
import { canSeeAdminActions } from "./header";

describe("canSeeAdminActions", () => {
	it("hides admin-gated actions from viewers and missing memberships", () => {
		expect(canSeeAdminActions("viewer")).toBe(false);
		expect(canSeeAdminActions(null)).toBe(false);
	});

	it("shows admin-gated actions to operators and admins", () => {
		expect(canSeeAdminActions("operator")).toBe(true);
		expect(canSeeAdminActions("admin")).toBe(true);
	});
});
