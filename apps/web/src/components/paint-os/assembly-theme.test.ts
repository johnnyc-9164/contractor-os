import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
	new URL("./styles/assembly.css", import.meta.url),
	"utf8",
);
const rules = [
	...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]+)\}/g),
];

describe("assembly theme preservation", () => {
	it("only assigns the supplied light palette when the host is not dark", () => {
		const palette = rules.find((rule) =>
			rule[2].includes("--background: #f7f9fb"),
		);
		expect(palette?.[1]).toContain(":root:not(.dark)");
		expect(palette?.[1]).toContain(".paint-os-assembly");
	});

	it("uses inherited semantic colors for the integration wrapper", () => {
		const wrapper = rules.find(
			(rule) => rule[1].trim() === ".paint-os-assembly",
		);
		expect(wrapper?.[2]).toContain("background: var(--background)");
		expect(wrapper?.[2]).toContain("color: var(--foreground)");
	});

	it("maps source surface, text, and accent colors to host tokens in dark mode", () => {
		const darkPalette = rules.find(
			(rule) =>
				rule[1].includes(".dark :is(") &&
				rule[2].includes("--pp-color-background:"),
		);
		for (const [source, host] of [
			["background", "background"],
			["surface", "background"],
			["surface-container-lowest", "card"],
			["on-background", "foreground"],
			["on-surface", "foreground"],
			["on-surface-variant", "muted-foreground"],
			["outline-variant", "border"],
			["primary", "primary"],
			["on-primary", "primary-foreground"],
			["secondary-container", "secondary"],
			["on-secondary-container", "secondary-foreground"],
			["on-secondary", "card"],
			["secondary", "muted-foreground"],
		]) {
			expect(darkPalette?.[2] ?? "").toContain(
				`--pp-color-${source}: var(--${host});`,
			);
		}
	});
});
