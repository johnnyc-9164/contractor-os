/** Convex workflow amounts are dollars, with at most two decimal places. */
export function parseInvoiceAmount(text: string): number | null {
	const value = text.trim();
	if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
	const [dollars, fractional = ""] = value.split(".");
	const cents = Number(dollars) * 100 + Number(fractional.padEnd(2, "0"));
	if (!Number.isSafeInteger(cents) || cents <= 0) return null;
	return cents / 100;
}
