import { describe, expect, it, vi } from "vitest";
import { makeBindings } from "./shared";

describe("supplied screen binding contract", () => {
	it("fails closed for unbound actions and fields", () => {
		const bindings = makeBindings({});
		expect(bindings.button("save", "Save").disabled).toBe(true);
		expect(bindings.button("save", "Save").onClick).toBeUndefined();
		expect(bindings.field("name", "Example").readOnly).toBe(true);
		expect(bindings.select("kind", "example").disabled).toBe(true);
	});

	it("uses supplied content slots including explicit hiding", () => {
		const bindings = makeBindings({
			slots: { records: "live", details: null },
		});
		expect(bindings.slot("records", "sample")).toBe("live");
		expect(bindings.slot("details", "sample")).toBeNull();
	});

	it("does not turn unsafe, whitespace or control-character destinations into links", () => {
		for (const href of [
			"javascript:alert(1)",
			"//external.example",
			"/path with space",
			"/path\u0000hidden",
		]) {
			const bindings = makeBindings({ links: { action: href } });
			expect(bindings.link("action", "Action", "#").href).toBeUndefined();
		}
		expect(
			makeBindings({ links: { action: "/leads" } }).link("action", "Leads", "#")
				.href,
		).toBe("/leads");
	});

	it("preserves Base UI boolean and scalar callback shapes", () => {
		const onFieldChange = vi.fn();
		const bindings = makeBindings({ onFieldChange });
		bindings.checkedToggle("enabled", false).onCheckedChange(true);
		bindings.range("amount", 0).onValueChange(12);
		bindings.range("amount", 0).onValueChange([24]);
		expect(onFieldChange.mock.calls).toEqual([
			["enabled", true],
			["amount", 12],
			["amount", 24],
		]);
	});
});
