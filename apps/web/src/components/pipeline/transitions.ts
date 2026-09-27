// TC-APP-01: Pipeline transition map and operation routing.
// Source of truth for legal moves: TC-UI-01-AC.md (PM rev2).
// The server-side guard in packages/backend remains authoritative.

export type LeadStage =
	| "Prospect"
	| "Outreach Sent"
	| "Reply Received"
	| "Qualifying"
	| "Site Visit Scheduled"
	| "Scope In Progress"
	| "Proposal Sent"
	| "Bid Submitted"
	| "Awarded"
	| "Won"
	| "On Hold"
	| "Disqualified"
	| "Lost";

export const BOARD_COLUMNS: LeadStage[] = [
	"Prospect",
	"Outreach Sent",
	"Reply Received",
	"Qualifying",
	"Site Visit Scheduled",
	"Scope In Progress",
	"Proposal Sent",
	"Bid Submitted",
	"Awarded",
	"On Hold",
];

export const TERMINAL_STAGES: LeadStage[] = ["Won", "Disqualified", "Lost"];

export const LEGAL_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
	Prospect: ["Outreach Sent", "Disqualified"],
	"Outreach Sent": ["Reply Received", "Disqualified", "Lost"],
	"Reply Received": ["Qualifying", "Disqualified", "Lost"],
	Qualifying: ["Site Visit Scheduled", "Disqualified", "Lost", "On Hold"],
	"Site Visit Scheduled": ["Scope In Progress", "On Hold", "Lost"],
	"Scope In Progress": ["Proposal Sent", "On Hold", "Lost"],
	"Proposal Sent": ["Bid Submitted", "Awarded", "Won", "On Hold", "Lost"],
	"Bid Submitted": ["Awarded", "On Hold", "Lost"],
	Awarded: ["Won", "On Hold", "Lost"],
	"On Hold": ["Qualifying", "Lost"],
	Disqualified: ["Prospect"],
	Lost: ["Prospect"],
	Won: [],
};

export function isLegalTransition(from: LeadStage, to: LeadStage): boolean {
	return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

// Contract name for catalog.dispatch per (source, target) pair.
export function opForTransition(from: LeadStage, to: LeadStage): string | null {
	if (!isLegalTransition(from, to)) return null;
	if (to === "On Hold") return "lead.hold";
	if (to === "Disqualified") return "lead.disqualify";
	if (to === "Lost") return "lead.lose";
	if (to === "Won") return "lead.win";
	if (from === "On Hold" && to === "Qualifying") return "lead.resume";
	if ((from === "Disqualified" || from === "Lost") && to === "Prospect")
		return "lead.reopen";
	switch (to) {
		case "Outreach Sent":
			return "lead.sendOutreach";
		case "Reply Received":
			return "lead.recordReply";
		case "Qualifying":
			return "lead.qualify";
		case "Site Visit Scheduled":
			return "lead.scheduleSiteVisit";
		case "Scope In Progress":
			return "lead.startScope";
		case "Proposal Sent":
			return "lead.sendProposal";
		case "Bid Submitted":
			return "lead.submitBid";
		case "Awarded":
			return "lead.award";
		default:
			return null;
	}
}

// Ops that need a field dialog on drop before dispatch.
// Each entry lists the fields the dialog must collect.
export type DialogField =
	| "channel"
	| "message_ref"
	| "reply_summary"
	| "client_name"
	| "client_type"
	| "qualification_notes"
	| "scheduled_at"
	| "address"
	| "visit_notes"
	| "amount_cents"
	| "proposal_doc_ref"
	| "bid_amount_cents"
	| "hold_reason"
	| "terminal_reason"
	| "reason_text"
	| "reopen_reason";

export const DIALOG_FIELDS: Record<string, DialogField[]> = {
	"lead.sendOutreach": ["channel", "message_ref"],
	"lead.recordReply": ["reply_summary"],
	"lead.qualify": ["client_name", "client_type", "qualification_notes"],
	"lead.scheduleSiteVisit": ["scheduled_at", "address", "visit_notes"],
	"lead.sendProposal": ["amount_cents", "proposal_doc_ref"],
	"lead.submitBid": ["bid_amount_cents"],
	"lead.hold": ["hold_reason"],
	"lead.disqualify": ["terminal_reason", "reason_text"],
	"lead.lose": ["terminal_reason", "reason_text"],
	"lead.reopen": ["reopen_reason"],
};

export function needsDialog(contract: string): boolean {
	return contract in DIALOG_FIELDS;
}

export const OUTREACH_CHANNELS = ["call", "sms", "email", "in_person"] as const;

export const TERMINAL_REASONS = [
	"no_show",
	"price",
	"timing",
	"fit",
	"duplicate",
	"other",
] as const;

// Human-readable labels for dialog fields.
export const FIELD_LABELS: Record<DialogField, string> = {
	channel: "Channel",
	message_ref: "Message reference (optional)",
	reply_summary: "Reply summary",
	client_name: "Client name",
	client_type: "Client type (optional)",
	qualification_notes: "Qualification notes (optional)",
	scheduled_at: "Scheduled date and time",
	address: "Site address (optional)",
	visit_notes: "Visit notes (optional)",
	amount_cents: "Proposal amount (USD)",
	proposal_doc_ref: "Proposal document reference (optional)",
	bid_amount_cents: "Bid amount (USD)",
	hold_reason: "Hold reason",
	terminal_reason: "Reason",
	reason_text: "Details (optional)",
	reopen_reason: "Re-open reason",
};
