import { displayStage } from "../../app/(app)/leads/lead-stages";
import { BOARD_COLUMNS, type LeadStage, TERMINAL_STAGES } from "./transitions";

export function toLeadStage(state: string): LeadStage | null {
	// Normalize raw list stages while preserving canonical board labels.
	const normalized = displayStage(state.trim());
	const all: LeadStage[] = [...BOARD_COLUMNS, ...TERMINAL_STAGES];
	return (all as string[]).includes(normalized)
		? (normalized as LeadStage)
		: null;
}
