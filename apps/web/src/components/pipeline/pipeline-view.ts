import type { PipelineLead } from "./lead-card";

export type LeadColumns = Record<string, PipelineLead[]>;

function normalizeSearch(value: string): string {
	return value.trim().toLocaleLowerCase("en-US");
}

export function leadMatchesQuery(lead: PipelineLead, query: string): boolean {
	const normalized = normalizeSearch(query);
	if (!normalized) return true;

	return [lead.title, lead.identifier, lead.stage, lead.lastHandledBy].some(
		(value) => value?.toLocaleLowerCase("en-US").includes(normalized),
	);
}

export function filterLeadColumns(
	columns: LeadColumns,
	query: string,
): LeadColumns {
	if (!normalizeSearch(query)) return columns;

	return Object.fromEntries(
		Object.entries(columns).map(([stage, leads]) => [
			stage,
			leads.filter((lead) => leadMatchesQuery(lead, query)),
		]),
	);
}

export function countLeads(columns: LeadColumns): number {
	return Object.values(columns).reduce(
		(total, leads) => total + leads.length,
		0,
	);
}
