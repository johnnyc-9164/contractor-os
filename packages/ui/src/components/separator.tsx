"use client";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { mergeClassName } from "@contractor-os/ui/lib/merge-class-name";
import type * as React from "react";

function Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive> & { decorative?: boolean }) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			role={decorative ? "none" : "separator"}
			className={mergeClassName(
				"shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
