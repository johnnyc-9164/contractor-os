export type JobProjection = {
	identifier: string;
	title: string | null;
	revision: number;
	evaluatedAt: number;
	mirrors: Record<
		string,
		{ status: string; value: string | number | boolean | null }
	>;
};

export type JobFinancials = {
	identifier: string;
	currency: "USD";
	contractAmount: number;
	billedToDate: number;
	collectedToDate: number;
	outstandingBalance: number;
};

export function jobDetailState(
	record: JobProjection | null | undefined,
	financials: JobFinancials | null | undefined,
) {
	if (record === undefined) return "loading" as const;
	if (record === null) return "missing" as const;
	if (financials === undefined) return "loading-financials" as const;
	return "ready" as const;
}

export function jobStatus(record: JobProjection): string | null {
	const mirror = record.mirrors.state ?? record.mirrors.status;
	if (mirror?.status !== "computed" || typeof mirror.value !== "string")
		return null;
	return mirror.value.trim() || null;
}

export function formatJobMoney(value: number, currency: "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(value);
}

export function formatJobDate(value: string | null): string | null {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(date);
}

export function recordedProgress(value: number | null): number | null {
	return value !== null && Number.isFinite(value) && value >= 0 && value <= 100
		? value
		: null;
}
