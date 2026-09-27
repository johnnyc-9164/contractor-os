export type EstimateInput = {
	rate_row_ref: string;
	kind: string;
	label: string;
	quantity: number;
	unit: string;
	notes?: string;
	rate_cents: number;
	burdened_pct?: number;
	epistemic: string;
};

export type CalculatedLine = EstimateInput & {
	extended_cost_cents: number;
	calculation_id: string;
};

export type EstimateCalculation = {
	lines: CalculatedLine[];
	base_total_cents: number;
	markup_pct: number;
	margin_pct: number;
	calculation_id: string;
};

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.entries(value as Record<string, unknown>)
			.filter(([, item]) => item !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function deterministicId(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `calc_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Pure deterministic money boundary. Callers may supply structure, never totals. */
export function calculate(
	inputs: readonly EstimateInput[],
	rate_set_version: string,
	formula_set_version: string,
): EstimateCalculation {
	const calculation_id = deterministicId(
		stable({ formula_set_version, inputs, rate_set_version }),
	);
	const lines = inputs.map((line) => ({
		...line,
		extended_cost_cents: Math.round(
			line.quantity *
				line.rate_cents *
				(1 + (line.kind === "labor" ? (line.burdened_pct ?? 0) / 100 : 0)),
		),
		calculation_id,
	}));
	return {
		lines,
		base_total_cents: lines.reduce(
			(total, line) => total + line.extended_cost_cents,
			0,
		),
		markup_pct: 0,
		margin_pct: 0,
		calculation_id,
	};
}
