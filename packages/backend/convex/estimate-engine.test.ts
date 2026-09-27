import { describe, expect, it } from "vitest";
import { calculate } from "./estimate_engine";

describe("estimate engine", () => {
	it("is deterministic and applies labor burden", () => {
		const input = [
			{
				rate_row_ref: "rr_labor",
				kind: "labor",
				label: "Painter",
				quantity: 10,
				unit: "hour",
				rate_cents: 5000,
				burdened_pct: 20,
				epistemic: "measured",
			},
		];
		const first = calculate(input, "rs_v1", "formula_v1");
		const replay = calculate(input, "rs_v1", "formula_v1");
		expect(replay).toEqual(first);
		expect(first.base_total_cents).toBe(60000);
		expect(first.lines[0]?.calculation_id).toBe(first.calculation_id);
	});
});
