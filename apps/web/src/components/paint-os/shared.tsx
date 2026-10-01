"use client";
import type {
	AnchorHTMLAttributes,
	ButtonHTMLAttributes,
	ChangeEvent,
	MouseEvent,
	ReactNode,
} from "react";

export type FieldValue = string | number | boolean;
export type ScreenProps<
	A extends string = string,
	F extends string = string,
	S extends string = string,
> = {
	/** Only supplied actions are enabled. Attach to the target feature's existing logic. */
	handlers?: Partial<Record<A, () => void>>;
	/** Link destinations are owned by the consuming router, never guessed from source labels. */
	links?: Partial<Record<A, string>>;
	fieldValues?: Partial<Record<F, FieldValue>>;
	onFieldChange?: (id: F, value: FieldValue) => void;
	onFilesChange?: (id: F, files: FileList | null) => void;
	/** Replace static regions with actual shadcn/Convex feature components. Null hides a slot. */
	slots?: Partial<Record<S, ReactNode>>;
};

function allowedHref(value: string): boolean {
	return (
		/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#[^\s]+$)/i.test(value) &&
		!Array.from(value).some((character) => character.charCodeAt(0) <= 32)
	);
}

export function makeBindings<
	A extends string,
	F extends string,
	S extends string,
>(props: ScreenProps<A, F, S>) {
	return {
		button(id: A, label: string): ButtonHTMLAttributes<HTMLButtonElement> {
			const handler = props.handlers?.[id];
			return {
				type: "button",
				disabled: !handler,
				"aria-label": label,
				title: handler ? undefined : "Reference control — not connected",
				onClick: handler ? () => handler() : undefined,
			};
		},
		link(
			id: A,
			label: string,
			originalHref: string,
		): AnchorHTMLAttributes<HTMLAnchorElement> {
			const handler = props.handlers?.[id];
			const candidate =
				props.links?.[id] ?? (originalHref === "#" ? "" : originalHref);
			const href = allowedHref(candidate) ? candidate : undefined;
			return {
				href,
				role: "link",
				"aria-label": label,
				"aria-disabled": !href && !handler,
				tabIndex: href || handler ? 0 : -1,
				title:
					href || handler ? undefined : "Reference link — supply a destination",
				onClick(event: MouseEvent<HTMLAnchorElement>) {
					if (handler) {
						event.preventDefault();
						handler();
					} else if (!href) event.preventDefault();
				},
				onKeyDown:
					!href && handler
						? (event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									handler();
								}
							}
						: undefined,
			};
		},
		field(id: F, initial: string | number) {
			const supplied = props.fieldValues?.[id];
			return {
				value:
					typeof supplied === "string" || typeof supplied === "number"
						? supplied
						: initial,
				readOnly: !props.onFieldChange,
				onChange: (
					event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
				) => props.onFieldChange?.(id, event.currentTarget.value),
			};
		},
		select(id: F, initial: string) {
			const supplied = props.fieldValues?.[id];
			return {
				value:
					typeof supplied === "string" || typeof supplied === "number"
						? supplied
						: initial,
				disabled: !props.onFieldChange,
				onChange: (event: ChangeEvent<HTMLSelectElement>) =>
					props.onFieldChange?.(id, event.currentTarget.value),
			};
		},
		toggle(id: F, initial: boolean) {
			const supplied = props.fieldValues?.[id];
			return {
				checked: typeof supplied === "boolean" ? supplied : initial,
				disabled: !props.onFieldChange,
				onChange: (event: ChangeEvent<HTMLInputElement>) =>
					props.onFieldChange?.(id, event.currentTarget.checked),
			};
		},
		checkedToggle(id: F, initial: boolean) {
			const supplied = props.fieldValues?.[id];
			return {
				checked: typeof supplied === "boolean" ? supplied : initial,
				disabled: !props.onFieldChange,
				onCheckedChange: (value: boolean) => props.onFieldChange?.(id, value),
			};
		},
		range(id: F, initial: string | number) {
			const supplied = props.fieldValues?.[id];
			const value = Number(
				typeof supplied === "number" || typeof supplied === "string"
					? supplied
					: initial,
			);
			return {
				value: Number.isFinite(value) ? value : 0,
				disabled: !props.onFieldChange,
				onValueChange: (value: number | readonly number[]) => {
					const next = typeof value === "number" ? value : value[0];
					if (Number.isFinite(next)) props.onFieldChange?.(id, next);
				},
			};
		},
		file(id: F) {
			return {
				disabled: !props.onFilesChange,
				onChange: (event: ChangeEvent<HTMLInputElement>) =>
					props.onFilesChange?.(id, event.currentTarget.files),
			};
		},
		slot(id: S, fallback: ReactNode): ReactNode {
			return props.slots && Object.hasOwn(props.slots, id)
				? props.slots[id]
				: fallback;
		},
	};
}
