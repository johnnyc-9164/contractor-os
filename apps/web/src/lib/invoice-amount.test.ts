import { describe, expect, it } from "vitest";
import { parseInvoiceAmount } from "./invoice-amount";

describe("invoice amount", () => {
	it.each([
		"12abc",
		"1.2.3",
		"0",
		"-12",
		"Infinity",
		"NaN",
		"",
		"  ",
		"1e3",
		"0.001",
		"1,200",
		"9007199254740992",
	])("rejects malformed or unsafe input %s", (value) =>
		expect(parseInvoiceAmount(value)).toBeNull(),
	);
	it("preserves backend dollar units and cents", () => {
		expect(parseInvoiceAmount("12.34")).toBe(12.34);
		expect(parseInvoiceAmount("0.01")).toBe(0.01);
		expect(parseInvoiceAmount(" 12.34 ")).toBe(12.34);
	});
});
