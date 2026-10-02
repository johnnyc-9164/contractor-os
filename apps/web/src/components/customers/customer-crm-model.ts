export type LeadListRecord = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	revision: number;
	updatedAt: number;
};

export type CustomerRecord = Omit<LeadListRecord, "state"> & {
	state: "won";
};

function normalizedState(state: string): string {
	return state.trim().toLowerCase().replaceAll(" ", "_");
}

export function selectCustomers(leads: LeadListRecord[]): CustomerRecord[] {
	return leads
		.filter((lead) => normalizedState(lead.state) === "won")
		.map(({ state: _state, ...lead }) => ({ ...lead, state: "won" as const }))
		.toSorted((left, right) => right.updatedAt - left.updatedAt);
}

export function filterCustomers(
	customers: CustomerRecord[],
	query: string,
): CustomerRecord[] {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) return customers;

	return customers.filter((customer) =>
		[customer.title, customer.identifier].some((value) =>
			value?.toLocaleLowerCase().includes(normalizedQuery),
		),
	);
}

export function customerInitials(customer: CustomerRecord): string {
	const title = customer.title?.trim();
	if (!title) return "CU";

	const initials = title
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase())
		.join("");

	return initials || "CU";
}
