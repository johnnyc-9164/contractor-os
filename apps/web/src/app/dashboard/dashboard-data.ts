export type DashboardRecord = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	updatedAt?: number;
};

const TERMINAL_LEAD_STATES = new Set(["won", "disqualified", "lost"]);
const TERMINAL_JOB_STATES = new Set([
	"cancelled",
	"canceled",
	"closed",
	"complete",
	"completed",
]);
const FOLLOW_UP_LEAD_STATES = new Set([
	"reply received",
	"qualifying",
	"site visit scheduled",
]);

function normalizeState(state: string): string {
	return state.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

export function humanizeState(state: string): string {
	const normalized = normalizeState(state);
	return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function sortRecent(
	records: DashboardRecord[],
	limit = 5,
): DashboardRecord[] {
	return [...records]
		.sort((left, right) => {
			const timeDifference = (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
			return timeDifference || left.identifier.localeCompare(right.identifier);
		})
		.slice(0, limit);
}

export function summarizeOperations(
	leads: DashboardRecord[],
	jobs: DashboardRecord[],
) {
	return {
		activeJobs: jobs.filter(
			(job) => !TERMINAL_JOB_STATES.has(normalizeState(job.state)),
		).length,
		followUps: leads.filter((lead) =>
			FOLLOW_UP_LEAD_STATES.has(normalizeState(lead.state)),
		).length,
		openLeads: leads.filter(
			(lead) => !TERMINAL_LEAD_STATES.has(normalizeState(lead.state)),
		).length,
	};
}

export function pageScopeLabel(count: number, isDone: boolean): string {
	if (isDone) return `${count} live ${count === 1 ? "record" : "records"}`;
	return `First ${count} live records`;
}
