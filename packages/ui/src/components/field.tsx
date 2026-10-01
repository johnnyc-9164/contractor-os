import { cn } from "@contractor-os/ui/lib/utils";
import type * as React from "react";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn("flex w-full flex-col gap-6", className)}
			{...props}
		/>
	);
}
function Field({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<"fieldset"> & {
	orientation?: "vertical" | "horizontal" | "responsive";
}) {
	return (
		<fieldset
			data-slot="field"
			data-orientation={orientation}
			className={cn(
				"flex w-full gap-3 data-[disabled=true]:opacity-50",
				orientation === "horizontal" ? "flex-row items-center" : "flex-col",
				className,
			)}
			{...props}
		/>
	);
}
function FieldLabel({
	className,
	htmlFor,
	children,
	...props
}: React.ComponentProps<"label">) {
	return (
		<label
			data-slot="field-label"
			htmlFor={htmlFor}
			className={cn(
				"flex w-fit items-center gap-2 font-medium text-sm leading-snug group-data-[disabled=true]/field:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
		</label>
	);
}
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn("text-muted-foreground text-sm leading-normal", className)}
			{...props}
		/>
	);
}
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
	return (
		<fieldset
			data-slot="field-set"
			className={cn("flex flex-col gap-6", className)}
			{...props}
		/>
	);
}
function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
	return (
		<legend
			data-slot="field-legend"
			className={cn("mb-3 font-medium text-base", className)}
			{...props}
		/>
	);
}

export {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
};
