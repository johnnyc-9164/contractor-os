import type { KeyboardEvent } from "react";
import { describe, expect, it } from "vitest";
import { makeBindings } from "./shared";

describe("handler-only link keyboard activation", () => {
	it("prevents the default Enter action before activating the supplied handler", () => {
		const calls: string[] = [];
		const link = makeBindings({
			handlers: { action: () => calls.push("handler") },
		}).link("action", "Action", "#");

		link.onKeyDown?.({
			key: "Enter",
			preventDefault: () => {
				calls.push("preventDefault");
			},
		} as KeyboardEvent<HTMLAnchorElement>);

		expect(calls).toEqual(["preventDefault", "handler"]);
	});

	it("leaves destination-backed links to native keyboard activation", () => {
		for (const handlers of [undefined, { action: () => {} }]) {
			const link = makeBindings({
				handlers,
				links: { action: "/leads" },
			}).link("action", "Action", "#");

			expect(link.href).toBe("/leads");
			expect(link.onKeyDown).toBeUndefined();
		}
	});

	it("does not intercept keys other than Enter", () => {
		const calls: string[] = [];
		const link = makeBindings({
			handlers: { action: () => calls.push("handler") },
		}).link("action", "Action", "#");

		for (const key of [" ", "Escape", "a"]) {
			link.onKeyDown?.({
				key,
				preventDefault: () => {
					calls.push("preventDefault");
				},
			} as KeyboardEvent<HTMLAnchorElement>);
		}

		expect(calls).toEqual([]);
	});

	it("keeps unbound links disabled without custom keyboard activation", () => {
		const link = makeBindings({}).link("action", "Action", "#");

		expect(link["aria-disabled"]).toBe(true);
		expect(link.tabIndex).toBe(-1);
		expect(link.onKeyDown).toBeUndefined();
	});
});
