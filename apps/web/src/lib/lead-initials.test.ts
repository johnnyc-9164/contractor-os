import { describe, expect, it } from "vitest";
import { leadInitials } from "./lead-initials";

describe("leadInitials", () => {
	it("uses first and last initials for a multi-word lead title", () => {
		expect(leadInitials("North Ridge Painting", "lead_123")).toBe("NP");
	});

	it("uses the first two characters for a single-word title", () => {
		expect(leadInitials("Acme", "lead_123")).toBe("AC");
	});

	it("falls back to the identifier when the title is blank", () => {
		expect(leadInitials("  ", "lead_123")).toBe("LE");
	});

	it("returns a safe marker when both display values are blank", () => {
		expect(leadInitials(null, "  ")).toBe("?");
	});
});
