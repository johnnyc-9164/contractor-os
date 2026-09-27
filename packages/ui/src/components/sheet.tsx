"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "@contractor-os/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
	return (
		<SheetPrimitive.Backdrop
			className={cn(
				"fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
				className,
			)}
			data-slot="sheet-overlay"
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	side = "right",
	...props
}: SheetPrimitive.Popup.Props & {
	side?: "top" | "right" | "bottom" | "left";
}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Popup
				className={cn(
					"fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition-transform duration-200 data-ending-style:translate-x-full data-starting-style:translate-x-full",
					side === "right" &&
						"inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
					side === "left" &&
						"inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
					side === "top" && "inset-x-0 top-0 h-auto border-b",
					side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
					className,
				)}
				data-slot="sheet-content"
				data-side={side}
				{...props}
			>
				{children}
				<SheetPrimitive.Close
					className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
					data-slot="sheet-close-button"
				>
					<XIcon className="size-4" />
					<span className="sr-only">Close</span>
				</SheetPrimitive.Close>
			</SheetPrimitive.Popup>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
			data-slot="sheet-header"
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("mt-auto flex flex-col gap-2 p-6 pt-0", className)}
			data-slot="sheet-footer"
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			className={cn("font-semibold text-lg", className)}
			data-slot="sheet-title"
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: SheetPrimitive.Description.Props) {
	return (
		<SheetPrimitive.Description
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="sheet-description"
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
