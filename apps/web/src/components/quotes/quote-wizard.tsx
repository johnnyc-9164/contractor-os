"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import { Card } from "@contractor-os/ui/components/card";
import { Checkbox } from "@contractor-os/ui/components/checkbox";
import { Input } from "@contractor-os/ui/components/input";
import { Label } from "@contractor-os/ui/components/label";
import { Textarea } from "@contractor-os/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { type FieldErrors, useFieldArray, useForm } from "react-hook-form";
import {
	defaultValues,
	dollarsToCents,
	EXTERIOR_SIDING,
	formatDollars,
	INTERIOR_SURFACES,
	lineItemsTotalDollars,
	type QuoteFormValues,
	quoteFormSchema,
	STEP_FIELDS,
	STEP_LABELS,
} from "./schemas";

type WizardStatus =
	| { kind: "editing" }
	| { kind: "submitting" }
	| { kind: "error"; message: string }
	| { kind: "sent"; amountCents: number };

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return <p className="mt-1 text-destructive text-xs">{message}</p>;
}

function StepIndicator({ step }: { step: number }) {
	return (
		<ol className="flex items-center gap-2">
			{STEP_LABELS.map((label, index) => {
				const state =
					index < step ? "done" : index === step ? "current" : "upcoming";
				return (
					<li className="flex items-center gap-2" key={label}>
						<span
							className={
								state === "done"
									? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs"
									: state === "current"
										? "flex size-6 items-center justify-center rounded-full border border-primary text-primary text-xs"
										: "flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground text-xs"
							}
						>
							{index + 1}
						</span>
						<span
							className={
								state === "current"
									? "font-medium text-sm"
									: "text-muted-foreground text-sm"
							}
						>
							{label}
						</span>
						{index < STEP_LABELS.length - 1 ? (
							<span className="mx-1 h-px w-6 bg-border" />
						) : null}
					</li>
				);
			})}
		</ol>
	);
}

function JobTypeStep({
	jobType,
	onChange,
	errors,
	register,
	setValue,
	watch,
}: {
	jobType: "interior" | "exterior";
	onChange: (value: "interior" | "exterior") => void;
	errors: FieldErrors<QuoteFormValues>;
	register: ReturnType<typeof useForm<QuoteFormValues>>["register"];
	setValue: ReturnType<typeof useForm<QuoteFormValues>>["setValue"];
	watch: ReturnType<typeof useForm<QuoteFormValues>>["watch"];
}) {
	const surfaces = watch("surfaces") ?? [];
	const toggleSurface = (surface: string) => {
		setValue(
			"surfaces",
			surfaces.includes(surface)
				? surfaces.filter((s) => s !== surface)
				: [...surfaces, surface],
			{ shouldValidate: true },
		);
	};
	return (
		<div className="space-y-6">
			<div>
				<Label>Job type</Label>
				<div className="mt-2 grid grid-cols-2 gap-3">
					{(["interior", "exterior"] as const).map((value) => (
						<button
							className={
								jobType === value
									? "rounded-none border border-primary bg-primary/5 px-4 py-3 text-left"
									: "rounded-none border border-border px-4 py-3 text-left hover:bg-muted"
							}
							key={value}
							onClick={() => onChange(value)}
							type="button"
						>
							<span className="font-medium text-sm capitalize">{value}</span>
							<span className="mt-1 block text-muted-foreground text-xs">
								{value === "interior"
									? "Rooms and surfaces inside the home"
									: "Siding and exterior surfaces"}
							</span>
						</button>
					))}
				</div>
				<FieldError message={errors.job_type?.message} />
			</div>
			{jobType === "interior" ? (
				<>
					<div>
						<Label htmlFor="rooms">Rooms to paint</Label>
						<Input
							id="rooms"
							placeholder="e.g. Living room, kitchen, primary bedroom"
							{...register("rooms")}
						/>
						<FieldError message={errors.rooms?.message} />
					</div>
					<div>
						<Label>Surfaces</Label>
						<div className="mt-2 space-y-2">
							{INTERIOR_SURFACES.map((surface) => {
								const id = `surface-${surface.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
								return (
									<div className="flex items-center gap-2" key={surface}>
										<Checkbox
											checked={surfaces.includes(surface)}
											id={id}
											onCheckedChange={() => toggleSurface(surface)}
										/>
										<label className="cursor-pointer text-sm" htmlFor={id}>
											{surface}
										</label>
									</div>
								);
							})}
						</div>
						<FieldError message={errors.surfaces?.message} />
					</div>
				</>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label htmlFor="stories">Stories</Label>
							<Input
								id="stories"
								inputMode="numeric"
								placeholder="e.g. 2"
								type="number"
								{...register("stories", { valueAsNumber: true })}
							/>
							<FieldError message={errors.stories?.message} />
						</div>
						<div>
							<Label htmlFor="square_footage">Approx. square footage</Label>
							<Input
								id="square_footage"
								inputMode="numeric"
								placeholder="e.g. 2400"
								type="number"
								{...register("square_footage", { valueAsNumber: true })}
							/>
							<FieldError message={errors.square_footage?.message} />
						</div>
					</div>
					<div>
						<Label htmlFor="siding">Siding type</Label>
						<Input
							id="siding"
							list="siding-options"
							placeholder="Select or type siding type"
							{...register("siding")}
						/>
						<datalist id="siding-options">
							{EXTERIOR_SIDING.map((option) => (
								<option key={option} value={option} />
							))}
						</datalist>
						<FieldError message={errors.siding?.message} />
					</div>
				</>
			)}
		</div>
	);
}

function ScopeStep({
	errors,
	register,
}: {
	errors: FieldErrors<QuoteFormValues>;
	register: ReturnType<typeof useForm<QuoteFormValues>>["register"];
}) {
	return (
		<div className="space-y-6">
			<div>
				<Label htmlFor="scope_notes">Scope notes</Label>
				<Textarea
					id="scope_notes"
					placeholder="What exactly gets painted? Colors, coats, areas included or excluded…"
					{...register("scope_notes")}
				/>
				<FieldError message={errors.scope_notes?.message} />
			</div>
			<div>
				<Label htmlFor="prep_notes">Prep notes</Label>
				<Textarea
					id="prep_notes"
					placeholder="Scraping, sanding, caulking, priming — what prep does the job need?"
					{...register("prep_notes")}
				/>
				<FieldError message={errors.prep_notes?.message} />
			</div>
		</div>
	);
}

function LineItemsStep({
	errors,
	fields,
	register,
	append,
	remove,
	total,
}: {
	errors: FieldErrors<QuoteFormValues>;
	fields: Array<{ id: string }>;
	register: ReturnType<typeof useForm<QuoteFormValues>>["register"];
	append: (value: { description: string; amount: number }) => void;
	remove: (index: number) => void;
	total: number;
}) {
	return (
		<div className="space-y-4">
			{fields.map((field, index) => (
				<div
					className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-start gap-2"
					key={field.id}
				>
					<div>
						<Label
							htmlFor={`line_items.${index}.description`}
							className="sr-only"
						>
							Description
						</Label>
						<Input
							id={`line_items.${index}.description`}
							placeholder="e.g. Labor — two coats, living room"
							{...register(`line_items.${index}.description` as const)}
						/>
						<FieldError
							message={errors.line_items?.[index]?.description?.message}
						/>
					</div>
					<div>
						<Label htmlFor={`line_items.${index}.amount`} className="sr-only">
							Amount
						</Label>
						<Input
							id={`line_items.${index}.amount`}
							inputMode="decimal"
							placeholder="0.00"
							type="number"
							step="0.01"
							{...register(`line_items.${index}.amount` as const, {
								valueAsNumber: true,
							})}
						/>
						<FieldError message={errors.line_items?.[index]?.amount?.message} />
					</div>
					<Button
						disabled={fields.length <= 1}
						onClick={() => remove(index)}
						size="sm"
						type="button"
						variant="outline"
					>
						Remove
					</Button>
				</div>
			))}
			{typeof errors.line_items?.message === "string" ? (
				<FieldError message={errors.line_items.message} />
			) : null}
			<div className="flex items-center justify-between">
				<Button
					onClick={() => append({ description: "", amount: Number.NaN })}
					type="button"
					variant="outline"
				>
					Add line item
				</Button>
				<p className="font-semibold text-lg tabular-nums">
					Total: {formatDollars(total)}
				</p>
			</div>
		</div>
	);
}

function ReviewStep({
	values,
	leadTitle,
	total,
}: {
	values: QuoteFormValues;
	leadTitle: string;
	total: number;
}) {
	return (
		<div className="space-y-6">
			<dl className="grid gap-4 sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground text-xs">Lead</dt>
					<dd className="mt-1 text-sm">{leadTitle}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground text-xs">Job type</dt>
					<dd className="mt-1 text-sm capitalize">{values.job_type}</dd>
				</div>
				{values.job_type === "interior" ? (
					<>
						<div>
							<dt className="text-muted-foreground text-xs">Rooms</dt>
							<dd className="mt-1 text-sm">{values.rooms}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Surfaces</dt>
							<dd className="mt-1 text-sm">
								{(values.surfaces ?? []).join(", ")}
							</dd>
						</div>
					</>
				) : (
					<>
						<div>
							<dt className="text-muted-foreground text-xs">Stories</dt>
							<dd className="mt-1 text-sm">{values.stories}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Siding</dt>
							<dd className="mt-1 text-sm">{values.siding}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Square footage</dt>
							<dd className="mt-1 text-sm">{values.square_footage}</dd>
						</div>
					</>
				)}
			</dl>
			{values.scope_notes?.trim() ? (
				<div>
					<h3 className="text-muted-foreground text-xs">Scope notes</h3>
					<p className="mt-1 whitespace-pre-wrap text-sm">
						{values.scope_notes}
					</p>
				</div>
			) : null}
			{values.prep_notes?.trim() ? (
				<div>
					<h3 className="text-muted-foreground text-xs">Prep notes</h3>
					<p className="mt-1 whitespace-pre-wrap text-sm">
						{values.prep_notes}
					</p>
				</div>
			) : null}
			<div>
				<h3 className="mb-2 font-medium text-sm">Line items</h3>
				<ul className="divide-y divide-border rounded-none border border-border">
					{values.line_items.map((item, index) => (
						<li
							className="flex items-center justify-between px-3 py-2 text-sm"
							key={`${index}-${item.description}`}
						>
							<span>{item.description}</span>
							<span className="tabular-nums">
								{formatDollars(
									typeof item.amount === "number" &&
										Number.isFinite(item.amount)
										? item.amount
										: 0,
								)}
							</span>
						</li>
					))}
				</ul>
				<p className="mt-3 text-right font-semibold text-lg tabular-nums">
					Quote total: {formatDollars(total)}
				</p>
			</div>
		</div>
	);
}

export function QuoteWizard({
	leadId,
	leadTitle,
}: {
	leadId: string;
	leadTitle: string;
}) {
	const [step, setStep] = useState(0);
	const [status, setStatus] = useState<WizardStatus>({ kind: "editing" });
	const dispatch = useMutation(api.backend.catalog.dispatch);

	const form = useForm<QuoteFormValues>({
		resolver: zodResolver(quoteFormSchema),
		defaultValues: defaultValues(),
		mode: "onTouched",
	});
	const {
		register,
		trigger,
		setValue,
		watch,
		getValues,
		formState: { errors },
	} = form;
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "line_items",
	});

	const jobType = watch("job_type");
	const lineItems = watch("line_items");
	const total = lineItemsTotalDollars(lineItems ?? []);

	const next = async () => {
		const valid = await trigger(
			STEP_FIELDS[step] as Array<keyof QuoteFormValues>,
		);
		if (valid) setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
	};

	const back = () => setStep((s) => Math.max(s - 1, 0));

	const submit = async () => {
		const valid = await trigger();
		if (!valid) return;
		const values = getValues();
		const totalDollars = lineItemsTotalDollars(values.line_items);
		const amountCents = dollarsToCents(totalDollars);
		setStatus({ kind: "submitting" });
		try {
			const result = await dispatch({
				contract: "lead.sendProposal",
				schema_version: 1,
				idempotency_key: crypto.randomUUID(),
				payload: { lead_id: leadId, amount_cents: amountCents },
			});
			if (result.ok) {
				setStatus({ kind: "sent", amountCents });
			} else {
				const detail =
					result.error?.message ??
					(result.blockers.length > 0
						? "The proposal was blocked by a business rule."
						: "The proposal could not be sent.");
				setStatus({ kind: "error", message: detail });
			}
		} catch (err) {
			setStatus({
				kind: "error",
				message:
					err instanceof Error ? err.message : "Failed to send the proposal.",
			});
		}
	};

	if (status.kind === "sent") {
		return (
			<Card className="p-8 text-center">
				<h1 className="font-semibold text-xl">Proposal sent</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					{formatDollars(status.amountCents / 100)} proposal sent for{" "}
					{leadTitle}. The lead moved to Proposal Sent.
				</p>
				<Link
					className="mt-6 inline-block"
					href={`/leads/${encodeURIComponent(leadId)}`}
				>
					<Button>Back to lead</Button>
				</Link>
			</Card>
		);
	}

	return (
		<div className="mx-auto max-w-2xl">
			<header className="mb-6">
				<h1 className="font-semibold text-2xl tracking-tight">New quote</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Quoting for <span className="font-medium">{leadTitle}</span>
				</p>
			</header>
			<div className="mb-8">
				<StepIndicator step={step} />
			</div>
			<Card className="p-6">
				{step === 0 ? (
					<JobTypeStep
						errors={errors}
						jobType={jobType}
						onChange={(value) =>
							setValue("job_type", value, { shouldValidate: true })
						}
						register={register}
						setValue={setValue}
						watch={watch}
					/>
				) : null}
				{step === 1 ? <ScopeStep errors={errors} register={register} /> : null}
				{step === 2 ? (
					<LineItemsStep
						append={append}
						errors={errors}
						fields={fields}
						register={register}
						remove={remove}
						total={total}
					/>
				) : null}
				{step === 3 ? (
					<ReviewStep
						leadTitle={leadTitle}
						total={total}
						values={getValues()}
					/>
				) : null}
				{status.kind === "error" ? (
					<p className="mt-4 rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
						{status.message}
					</p>
				) : null}
				<div className="mt-8 flex items-center justify-between">
					<Button
						disabled={step === 0 || status.kind === "submitting"}
						onClick={back}
						type="button"
						variant="outline"
					>
						Back
					</Button>
					{step < STEP_LABELS.length - 1 ? (
						<Button onClick={next} type="button">
							Continue
						</Button>
					) : (
						<Button
							disabled={status.kind === "submitting"}
							onClick={submit}
							type="button"
						>
							{status.kind === "submitting" ? "Sending…" : "Send proposal"}
						</Button>
					)}
				</div>
			</Card>
		</div>
	);
}

type LeadState = { value?: unknown } & Record<string, unknown>;

export function QuoteWizardGuard({ leadId }: { leadId: string }) {
	const record = useQuery(api.backend.inspectRecord, {
		blueprint: "co_lead",
		identifier: leadId,
	});

	if (record === undefined) {
		return (
			<p className="py-24 text-center text-muted-foreground text-sm">
				Loading lead…
			</p>
		);
	}
	if (record === null) {
		return (
			<Card className="p-8 text-center">
				<h1 className="font-semibold text-xl">Lead not found</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					This lead is not available in your account.
				</p>
				<Link className="mt-6 inline-block" href="/leads">
					<Button variant="outline">Back to leads</Button>
				</Link>
			</Card>
		);
	}

	const mirrorState = (record.mirrors?.state as LeadState | undefined)?.value;
	const rawStage = typeof mirrorState === "string" ? mirrorState : null;
	// The component mirror stores snake_case ("scope_in_progress"); the leads
	// table stores the display form ("Scope In Progress"). Accept either.
	const isScopeInProgress =
		rawStage === "scope_in_progress" || rawStage === "Scope In Progress";

	if (!isScopeInProgress) {
		return (
			<Card className="mx-auto max-w-2xl p-8 text-center">
				<h1 className="font-semibold text-xl">Quote not available</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					A proposal can only be sent while a lead is in{" "}
					<span className="font-medium">Scope In Progress</span> — that is the
					stage where the walkthrough is done and the scope is being priced.
					This lead is currently{" "}
					<span className="font-medium">
						{rawStage ?? "in an unknown stage"}
					</span>
					, so there is nothing to quote yet.
				</p>
				<Link
					className="mt-6 inline-block"
					href={`/leads/${encodeURIComponent(leadId)}`}
				>
					<Button variant="outline">Back to lead</Button>
				</Link>
			</Card>
		);
	}

	return <QuoteWizard leadId={leadId} leadTitle={record.title || leadId} />;
}
