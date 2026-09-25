import { describe, expect, it } from "vitest";
import { cn } from "./utils.js";

describe("cn", () => {
	it("joins string class names with spaces", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("ignores falsy values", () => {
		expect(cn("a", false, null, undefined, "b")).toBe("a b");
	});

	it("supports conditional object syntax", () => {
		expect(cn("a", { b: true, c: false })).toBe("a b");
	});

	it("supports nested arrays", () => {
		expect(cn("a", ["b", "c"])).toBe("a b c");
	});

	it("merges conflicting tailwind classes with last-wins", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("keeps non-conflicting tailwind classes", () => {
		expect(cn("px-2", "py-4")).toBe("px-2 py-4");
	});

	it("returns an empty string for no inputs", () => {
		expect(cn()).toBe("");
	});

	it("mixes strings and conditionals", () => {
		expect(cn("text-sm", { "font-bold": true })).toBe("text-sm font-bold");
	});
});
