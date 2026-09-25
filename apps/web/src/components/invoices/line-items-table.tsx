"use client";

import { Button } from "@contractor-os/ui/components/button";
import { Input } from "@contractor-os/ui/components/input";
import { Label } from "@contractor-os/ui/components/label";
import type { LineItem } from "./invoice-schema";
import { formatCents } from "./invoice-schema";

type LineItemsTableProps = {
	items: LineItem[];
	disabled: boolean;
	onChange: (items: LineItem[]) => void;
	fieldErrors: Record<string, string | undefined>;
};

function rowErrorKey(index: number, field: string): string {
	return `items.${index}.${field}`;
}

export function LineItemsTable({
	items,
	disabled,
	onChange,
	fieldErrors,
}: LineItemsTableProps) {
	const updateItem = (index: number, patch: Partial<LineItem>) => {
		onChange(
			items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		);
	};

	const removeItem = (index: number) => {
		onChange(items.filter((_, i) => i !== index));
	};

	const addItem = () => {
		onChange([...items, { description: "", quantity: 1, unitPrice: 0 }]);
	};

	const parseNumber = (value: string): number => {
		const parsed = Number.parseFloat(value);
		return Number.isNaN(parsed) ? Number.NaN : parsed;
	};

	return (
		<div className="space-y-2">
			<div className="overflow-x-auto rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50 text-left">
							<th className="px-3 py-2 font-medium">Description</th>
							<th className="w-24 px-3 py-2 font-medium">Qty</th>
							<th className="w-32 px-3 py-2 font-medium">Unit price</th>
							<th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
							<th className="w-12 px-3 py-2">
								<span className="sr-only">Remove</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item, index) => {
							const lineCents =
								Number.isFinite(item.quantity) &&
								Number.isFinite(item.unitPrice) &&
								item.quantity > 0 &&
								item.unitPrice >= 0
									? Math.round(item.quantity * item.unitPrice * 100)
									: 0;
							return (
								<tr key={index} className="border-b last:border-0">
									<td className="px-3 py-2">
										<Label htmlFor={`item-${index}-desc`} className="sr-only">
											Description for line {index + 1}
										</Label>
										<Input
											id={`item-${index}-desc`}
											value={item.description}
											onChange={(e) =>
												updateItem(index, { description: e.target.value })
											}
											placeholder="Exterior siding repaint"
											disabled={disabled}
											aria-invalid={
												!!fieldErrors[rowErrorKey(index, "description")]
											}
										/>
										{fieldErrors[rowErrorKey(index, "description")] && (
											<p className="mt-1 text-destructive text-xs">
												{fieldErrors[rowErrorKey(index, "description")]}
											</p>
										)}
									</td>
									<td className="px-3 py-2">
										<Label htmlFor={`item-${index}-qty`} className="sr-only">
											Quantity for line {index + 1}
										</Label>
										<Input
											id={`item-${index}-qty`}
											type="number"
											min="0"
											step="any"
											value={Number.isNaN(item.quantity) ? "" : item.quantity}
											onChange={(e) =>
												updateItem(index, {
													quantity: parseNumber(e.target.value),
												})
											}
											disabled={disabled}
											aria-invalid={
												!!fieldErrors[rowErrorKey(index, "quantity")]
											}
										/>
										{fieldErrors[rowErrorKey(index, "quantity")] && (
											<p className="mt-1 text-destructive text-xs">
												{fieldErrors[rowErrorKey(index, "quantity")]}
											</p>
										)}
									</td>
									<td className="px-3 py-2">
										<Label htmlFor={`item-${index}-price`} className="sr-only">
											Unit price for line {index + 1}
										</Label>
										<Input
											id={`item-${index}-price`}
											type="number"
											min="0"
											step="0.01"
											value={Number.isNaN(item.unitPrice) ? "" : item.unitPrice}
											onChange={(e) =>
												updateItem(index, {
													unitPrice: parseNumber(e.target.value),
												})
											}
											disabled={disabled}
											aria-invalid={
												!!fieldErrors[rowErrorKey(index, "unitPrice")]
											}
										/>
										{fieldErrors[rowErrorKey(index, "unitPrice")] && (
											<p className="mt-1 text-destructive text-xs">
												{fieldErrors[rowErrorKey(index, "unitPrice")]}
											</p>
										)}
									</td>
									<td className="px-3 py-2 text-right tabular-nums">
										{formatCents(lineCents)}
									</td>
									<td className="px-3 py-2 text-right">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeItem(index)}
											disabled={disabled || items.length <= 1}
											aria-label={`Remove line ${index + 1}`}
										>
											Remove
										</Button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addItem}
				disabled={disabled}
			>
				Add line item
			</Button>
			{fieldErrors.items && (
				<p className="text-destructive text-xs">{fieldErrors.items}</p>
			)}
		</div>
	);
}
