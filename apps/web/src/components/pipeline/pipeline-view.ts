import type { PipelineLead } from "./lead-card";

export type LeadColumns = Record<string, PipelineLead[]>;

export type ReopenedLead = {
	lead: PipelineLead;
	// Qualifying creates a component lead with a distinct identifier.
	componentIdentifier: string | null;
};

export function reopenedLeadFromResult(
	source: PipelineLead,
	recordId: string | null,
	actor: string | null,
	updatedAt: number,
): PipelineLead | null {
	if (!recordId) return null;
	return {
		id: recordId,
		identifier: recordId,
		title: source.title,
		stage: "Prospect",
		updatedAt,
		lastHandledBy: actor,
	};
}

export function mergeReopenedLeads(
	componentLeads: PipelineLead[],
	reopenedLeads: ReopenedLead[],
): PipelineLead[] {
	const componentIds = new Set(componentLeads.map((lead) => lead.id));
	const componentIdentifiers = new Set(
		componentLeads.map((lead) => lead.identifier),
	);
	return [
		...componentLeads,
		...reopenedLeads
			.filter(
				({ lead, componentIdentifier }) =>
					!componentIds.has(lead.id) &&
					(!componentIdentifier ||
						!componentIdentifiers.has(componentIdentifier)),
			)
			.map(({ lead }) => lead),
	];
}

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

export function findLeadById(
	columns: LeadColumns,
	terminalLeads: PipelineLead[],
	leadId: string | null,
): PipelineLead | null {
	if (!leadId) return null;

	for (const leads of Object.values(columns)) {
		const lead = leads.find((candidate) => candidate.id === leadId);
		if (lead) return lead;
	}

	return terminalLeads.find((lead) => lead.id === leadId) ?? null;
}
