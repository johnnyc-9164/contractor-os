import { cn } from "@contractor-os/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

function NativeSelect({
	className,
	children,
	...props
}: React.ComponentProps<"select">) {
	return (
		<div
			data-slot="native-select-wrapper"
			className="relative w-full has-disabled:opacity-50"
		>
			<select
				data-slot="native-select"
				className={cn(
					"h-9 w-full appearance-none rounded-md border border-input bg-transparent py-2 pr-8 pl-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed",
					className,
				)}
				{...props}
			>
				{children}
			</select>
			<ChevronDown
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
		</div>
	);
}
function NativeSelectOption(props: React.ComponentProps<"option">) {
	return <option data-slot="native-select-option" {...props} />;
}
function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
	return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
