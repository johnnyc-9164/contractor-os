import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("assembly style boundaries", () => {
	it("limits the vertical padding reset to source cards, preserving live workflow cards", () => {
		const css = readFileSync(
			new URL("./styles/assembly.css", import.meta.url),
			"utf8",
		);
		const resets = [
			...css.matchAll(/([^{}]+)\{[^{}]*padding-block:\s*0;[^{}]*\}/g),
		];

		expect(resets).toHaveLength(1);
		expect(resets[0][1].trim()).toBe(
			'[data-paintpro-root] [data-paint-os-region="source-card"]',
		);
	});
});
