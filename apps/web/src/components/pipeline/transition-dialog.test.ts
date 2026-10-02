import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { type PendingTransition, TransitionDialog } from "./transition-dialog";
import { blockedTransitionReason } from "./transitions";

vi.mock("radix-ui", async () => {
	const { createElement } = await import("react");
	const passthrough = ({ children }: { children?: ReactNode }) =>
		createElement("div", null, children);
	return {
		Dialog: {
			Root: passthrough,
			Portal: passthrough,
			Overlay: passthrough,
			Content: passthrough,
			Title: passthrough,
			Description: passthrough,
		},
	};
});

function renderPending(pending: PendingTransition): string {
	return renderToStaticMarkup(
		createElement(TransitionDialog, {
			pending,
			onConfirm: () => {},
			onCancel: () => {},
		}),
	);
}

describe("TransitionDialog proposal prerequisite", () => {
	it("blocks only proposal dispatch while estimate integration is unavailable", () => {
		expect(blockedTransitionReason("lead.sendProposal")).toContain(
			"approved estimate version",
		);
		for (const contract of ["lead.hold", "lead.award", "lead.win"]) {
			expect(blockedTransitionReason(contract)).toBeNull();
		}
	});

	it("explains the approved estimate dependency and offers no invalid proposal submission", () => {
		const markup = renderPending({
			leadId: "LEAD-1042",
			leadTitle: "A real lead",
			from: "Scope In Progress",
			to: "Proposal Sent",
			contract: "lead.sendProposal",
			fields: ["amount_cents", "proposal_doc_ref"],
		});

		expect(markup).toContain("approved estimate version");
		expect(markup).toContain("engine-computed total");
		expect(markup).toContain(
			"unavailable until approved estimates are connected",
		);
		expect(markup).not.toContain("Proposal amount (USD)");
		expect(markup).not.toContain("Confirm move");
		expect(markup).toContain("Close");
	});

	it("still offers the regular form for unrelated legal transitions", () => {
		const markup = renderPending({
			leadId: "LEAD-1042",
			leadTitle: "A real lead",
			from: "Qualifying",
			to: "On Hold",
			contract: "lead.hold",
			fields: ["hold_reason"],
		});

		expect(markup).toContain("Hold reason");
		expect(markup).toContain("Confirm move");
	});
});
