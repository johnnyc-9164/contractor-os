const STAGE_LABELS: Record<string, string> = {
	new: "Prospect",
	outreach_sent: "Outreach Sent",
	reply_received: "Reply Received",
	qualifying: "Qualifying",
	site_visit_scheduled: "Site Visit Scheduled",
	scope_in_progress: "Scope In Progress",
	proposal_sent: "Proposal Sent",
	bid_submitted: "Bid Submitted",
	awarded: "Awarded",
	won: "Won",
	on_hold: "On Hold",
	disqualified: "Disqualified",
	lost: "Lost",
};

const FORWARD_TRANSITIONS: Record<string, string[]> = {
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
	Disqualified: ["Prospect (re-open)"],
	Lost: ["Prospect (re-open)"],
	Won: [],
};

const TERMINAL_STAGES = new Set(["Won", "Disqualified", "Lost"]);

export type StageGroup = "active" | "on-hold" | "terminal";

export function displayStage(state: string): string {
	return STAGE_LABELS[state] ?? state;
}

export function nextStage(state: string): string | null {
	return FORWARD_TRANSITIONS[displayStage(state)]?.[0] ?? null;
}

export function stageGroup(state: string): StageGroup {
	const stage = displayStage(state);
	if (TERMINAL_STAGES.has(stage)) return "terminal";
	if (stage === "On Hold") return "on-hold";
	return "active";
}
