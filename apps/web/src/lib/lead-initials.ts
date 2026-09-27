export function leadInitials(title: string | null, identifier: string): string {
	const displayValue = title?.trim() || identifier.trim();
	if (!displayValue) return "?";

	const words = displayValue.split(/\s+/u).filter(Boolean);
	const firstWord = Array.from(words[0] ?? "");
	const characters =
		words.length > 1
			? [firstWord[0], Array.from(words.at(-1) ?? "")[0]]
			: firstWord.slice(0, 2);

	return characters.filter(Boolean).join("").toLocaleUpperCase("en-US") || "?";
}
