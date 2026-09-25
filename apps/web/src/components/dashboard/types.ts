export type Lead = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	revision: number;
	updatedAt: number;
};

export type HistoryEvent = {
	id: string;
	identifier: string;
	type: string;
	actorId: string;
	occurredAt: number;
	command: string | null;
};

export const TERMINAL_STAGES = new Set(["Won", "Disqualified", "Lost"]);

export function isTerminal(state: string): boolean {
	return TERMINAL_STAGES.has(state);
}

export function leadName(lead: Lead): string {
	return lead.title || lead.identifier;
}

export function relativeDate(timestamp: number): string {
	const elapsed = Date.now() - timestamp;
	const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		["day", 86_400_000],
		["hour", 3_600_000],
		["minute", 60_000],
	];
	for (const [unit, milliseconds] of units) {
		if (Math.abs(elapsed) >= milliseconds) {
			return formatter.format(-Math.round(elapsed / milliseconds), unit);
		}
	}
	return "just now";
}

export function isToday(timestamp: number): boolean {
	const d = new Date(timestamp);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}

export function isThisMonth(timestamp: number): boolean {
	const d = new Date(timestamp);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
	);
}
