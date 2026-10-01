import { cn } from "@contractor-os/ui/lib/utils";

/** Preserve the supplied Base UI state-aware class callback contract. */
export function mergeClassName<State>(
	base: string,
	className?: string | ((state: State) => string | undefined),
): string | ((state: State) => string) {
	return typeof className === "function"
		? (state: State) => cn(base, className(state))
		: cn(base, className);
}
