import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LeadCard, type PipelineLead } from "./lead-card";

vi.mock("@/lib/lead-initials", () => ({ leadInitials: () => "AL" }));

const lead: PipelineLead = {
	id: "lead-1",
	identifier: "LEAD-1042",
	title: "A real lead",
	stage: "Proposal Sent",
	updatedAt: 1_700_000_000_000,
	lastHandledBy: null,
};

function terminalButton(markup: string, label: string): string | undefined {
	return (markup.match(/<button\b[^>]*>[^<]*/g) ?? []).find((button) =>
		button.includes(label),
	);
}

describe("LeadCard terminal actions", () => {
	it("disables Won for non-principals with the Sheet explanation while leaving Lost available", () => {
		const markup = renderToStaticMarkup(
			createElement(LeadCard, {
				lead,
				isPrincipal: false,
				onTerminalMove: () => {},
			}),
		);
		const won = terminalButton(markup, "Mark Won");
		const lost = terminalButton(markup, "Mark Lost");

		expect(won).toMatch(/\sdisabled(?:=|\s|>)/);
		expect(won).toContain('title="Moving to Won requires principal authority"');
		expect(lost).toBeDefined();
		expect(lost).not.toMatch(/\sdisabled(?:=|\s|>)/);
	});

	it("keeps Won available for principals", () => {
		const markup = renderToStaticMarkup(
			createElement(LeadCard, {
				lead,
				isPrincipal: true,
				onTerminalMove: () => {},
			}),
		);
		const won = terminalButton(markup, "Mark Won");

		expect(won).toBeDefined();
		expect(won).not.toMatch(/\sdisabled(?:=|\s|>)/);
	});
});
