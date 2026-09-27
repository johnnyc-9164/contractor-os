/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function declarations(selector: string) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const block = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
	if (!block) {
		throw new Error(`Missing CSS block: ${selector}`);
	}

	return new Map(
		[...block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
			match[1],
			match[2].trim(),
		]),
	);
}

function relativeLuminance(hex: string) {
	const channels = hex
		.match(/[\da-f]{2}/gi)
		?.map((channel) => Number.parseInt(channel, 16) / 255);

	if (channels?.length !== 3) {
		throw new Error(`Expected a six-digit hex color, received ${hex}`);
	}

	const [red, green, blue] = channels.map((channel) =>
		channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
	);
	if (red === undefined || green === undefined || blue === undefined) {
		throw new Error(`Could not calculate luminance for ${hex}`);
	}

	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string) {
	const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
	const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
	return (lighter + 0.05) / (darker + 0.05);
}

const contrastPairs = [
	["foreground", "background"],
	["card-foreground", "card"],
	["primary-foreground", "primary"],
	["secondary-foreground", "secondary"],
	["muted-foreground", "muted"],
	["accent-foreground", "accent"],
	["sidebar-primary-foreground", "sidebar-primary"],
	["sidebar-accent-foreground", "sidebar-accent"],
] as const;

describe("PaintPro semantic theme", () => {
	it("keeps the approved light palette behind semantic tokens", () => {
		const light = declarations(":root");

		expect(Object.fromEntries(light)).toMatchObject({
			background: "#f7f9fb",
			foreground: "#191c1e",
			primary: "#003ec7",
			"primary-foreground": "#ffffff",
			accent: "#dde1ff",
			"accent-foreground": "#0038b6",
			ring: "#004ced",
			radius: "0.5rem",
			"page-gutter": "1rem",
			"page-gutter-wide": "2rem",
			"content-max": "90rem",
		});
	});

	it("provides complete light and dark contrast pairs at WCAG AA", () => {
		for (const selector of [":root", ".dark"]) {
			const theme = declarations(selector);

			for (const [foreground, background] of contrastPairs) {
				const ratio = contrastRatio(
					theme.get(foreground) ?? "",
					theme.get(background) ?? "",
				);
				expect(
					ratio,
					`${selector} ${foreground} on ${background}`,
				).toBeGreaterThanOrEqual(4.5);
			}

			expect(
				contrastRatio("#ffffff", theme.get("destructive") ?? ""),
				`${selector} white on destructive`,
			).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("keeps Tailwind on semantic aliases and rejects decorative effects", () => {
		for (const token of [
			"primary",
			"primary-foreground",
			"accent",
			"accent-foreground",
			"muted",
			"muted-foreground",
			"background",
			"foreground",
		]) {
			expect(css).toContain(`--color-${token}: var(--${token});`);
		}

		expect(css).toContain("--spacing-page: var(--page-gutter);");
		expect(css).toContain("--container-content: var(--content-max);");
		expect(css).not.toMatch(
			/(?:linear|radial|conic)-gradient|backdrop-filter|filter:\s*blur/i,
		);
	});
});
