"use client";

import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import { Input } from "@contractor-os/ui/components/input";
import { Label } from "@contractor-os/ui/components/label";
import { Textarea } from "@contractor-os/ui/components/textarea";
import {
	ArrowRight,
	CalendarDays,
	Check,
	ClipboardCheck,
	Home,
	Mail,
	MapPin,
	Paintbrush,
	Phone,
	ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	buildEstimateHandoff,
	EMPTY_ESTIMATE_INTAKE,
	type EstimateIntakeErrors,
	type EstimateIntake as EstimateIntakeValues,
	PROJECT_TYPES,
	validateEstimateIntake,
} from "./intake";

type IntakeStatus = "editing" | "prepared";

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p className="mt-1 text-destructive text-xs" role="alert">
			{message}
		</p>
	);
}

function BriefRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Home;
	label: string;
	value: string;
}) {
	return (
		<div className="grid grid-cols-[auto_1fr] gap-3 border-border border-b py-4 last:border-b-0">
			<div className="flex size-8 items-center justify-center border border-border bg-muted">
				<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
			</div>
			<div className="min-w-0">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
					{label}
				</p>
				<p className="mt-1 text-sm">{value}</p>
			</div>
		</div>
	);
}

export function EstimateIntake() {
	const [values, setValues] = useState<EstimateIntakeValues>(
		EMPTY_ESTIMATE_INTAKE,
	);
	const [errors, setErrors] = useState<EstimateIntakeErrors>({});
	const [status, setStatus] = useState<IntakeStatus>("editing");

	const update = <Key extends keyof EstimateIntakeValues>(
		key: Key,
		value: EstimateIntakeValues[Key],
	) => {
		setValues((current) => ({ ...current, [key]: value }));
		setErrors((current) => ({
			...current,
			[key]: undefined,
			contact: undefined,
		}));
		setStatus("editing");
	};

	const prepare = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors = validateEstimateIntake(values);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length === 0) setStatus("prepared");
	};

	const handoffHref = buildEstimateHandoff(values);

	return (
		<main className="min-h-full overflow-auto bg-background text-foreground">
			<section className="border-border border-b bg-foreground text-background">
				<div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_22rem] lg:items-end lg:py-20">
					<div className="max-w-3xl">
						<div className="mb-5 flex items-center gap-2 font-medium text-xs uppercase tracking-[0.22em] text-background/70">
							<Paintbrush aria-hidden="true" className="size-4" />
							PaintPro project intake
						</div>
						<h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
							A better estimate starts with the real scope.
						</h1>
						<p className="mt-6 max-w-2xl text-background/70 text-base leading-7 sm:text-lg">
							Share the project details a painter actually needs. We will
							prepare a clear request you can hand off for human review.
						</p>
					</div>
					<div className="border border-background/25 p-5">
						<div className="flex items-start gap-3">
							<ShieldCheck aria-hidden="true" className="mt-0.5 size-5" />
							<div>
								<p className="font-medium text-sm">No instant-price theater</p>
								<p className="mt-2 text-background/65 text-xs leading-5">
									A painter still confirms the scope, price, and availability.
									This page does not reserve a time.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-12 lg:py-12">
				<aside className="lg:col-span-4">
					<Card className="lg:sticky lg:top-6">
						<CardHeader className="border-b">
							<CardTitle>Project brief</CardTitle>
							<CardDescription>
								Your answers stay in this browser until you choose a handoff.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<BriefRow
								icon={Home}
								label="Project"
								value={values.projectType || "Choose a project type"}
							/>
							<BriefRow
								icon={MapPin}
								label="Location"
								value={values.location.trim() || "Add a city or address"}
							/>
							<BriefRow
								icon={CalendarDays}
								label="Timing"
								value={values.timeline.trim() || "Flexible"}
							/>
							<BriefRow
								icon={ClipboardCheck}
								label="Pricing"
								value="After a human scope review"
							/>
						</CardContent>
						<CardFooter className="items-start gap-3 bg-muted/50">
							<ShieldCheck
								aria-hidden="true"
								className="mt-0.5 size-4 shrink-0 text-muted-foreground"
							/>
							<p className="text-muted-foreground text-xs leading-5">
								Public lead storage is not connected yet. Preparing this brief
								does not send or save it.
							</p>
						</CardFooter>
					</Card>
				</aside>

				<div className="lg:col-span-8">
					<Card>
						<CardHeader className="border-b">
							<p className="font-medium text-primary text-xs uppercase tracking-widest">
								Step 1 of 1
							</p>
							<CardTitle className="text-xl">
								Build your project brief
							</CardTitle>
							<CardDescription>
								No account required. Required fields are marked with an
								asterisk.
							</CardDescription>
						</CardHeader>

						{status === "prepared" ? (
							<PreparedHandoff
								href={handoffHref}
								onEdit={() => setStatus("editing")}
							/>
						) : (
							<form onSubmit={prepare} noValidate>
								<CardContent className="flex flex-col gap-7 py-6">
									<fieldset>
										<legend className="mb-3 font-medium text-sm">
											What are we painting? *
										</legend>
										<div className="grid gap-2 sm:grid-cols-2">
											{PROJECT_TYPES.map((projectType) => {
												const selected = values.projectType === projectType;
												return (
													<label
														className="flex min-h-11 cursor-pointer items-center justify-between border border-input bg-background px-3 py-2 text-sm has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring/50"
														key={projectType}
													>
														<input
															checked={selected}
															className="sr-only"
															name="projectType"
															onChange={() =>
																update("projectType", projectType)
															}
															type="radio"
															value={projectType}
														/>
														<span>{projectType}</span>
														{selected ? (
															<Check
																aria-hidden="true"
																className="size-4 text-primary"
															/>
														) : null}
													</label>
												);
											})}
										</div>
										<FieldError message={errors.projectType} />
									</fieldset>

									<div className="grid gap-5 sm:grid-cols-2">
										<div>
											<Label htmlFor="estimate-name">Name *</Label>
											<Input
												aria-invalid={Boolean(errors.name)}
												className="mt-2 h-10"
												id="estimate-name"
												onChange={(event) => update("name", event.target.value)}
												placeholder="Your name"
												value={values.name}
											/>
											<FieldError message={errors.name} />
										</div>
										<div>
											<Label htmlFor="estimate-location">
												Project location *
											</Label>
											<Input
												aria-invalid={Boolean(errors.location)}
												className="mt-2 h-10"
												id="estimate-location"
												onChange={(event) =>
													update("location", event.target.value)
												}
												placeholder="City or project address"
												value={values.location}
											/>
											<FieldError message={errors.location} />
										</div>
									</div>

									<div className="grid gap-5 sm:grid-cols-2">
										<div>
											<Label htmlFor="estimate-email">
												<Mail aria-hidden="true" className="size-3.5" />
												Email
											</Label>
											<Input
												aria-invalid={Boolean(errors.email || errors.contact)}
												autoComplete="email"
												className="mt-2 h-10"
												id="estimate-email"
												onChange={(event) =>
													update("email", event.target.value)
												}
												placeholder="you@example.com"
												type="email"
												value={values.email}
											/>
											<FieldError message={errors.email} />
										</div>
										<div>
											<Label htmlFor="estimate-phone">
												<Phone aria-hidden="true" className="size-3.5" />
												Phone
											</Label>
											<Input
												aria-invalid={Boolean(errors.phone || errors.contact)}
												autoComplete="tel"
												className="mt-2 h-10"
												id="estimate-phone"
												onChange={(event) =>
													update("phone", event.target.value)
												}
												placeholder="(555) 555-0123"
												type="tel"
												value={values.phone}
											/>
											<FieldError message={errors.phone} />
										</div>
									</div>
									<FieldError message={errors.contact} />

									<div>
										<Label htmlFor="estimate-timeline">Preferred timing</Label>
										<Input
											className="mt-2 h-10"
											id="estimate-timeline"
											onChange={(event) =>
												update("timeline", event.target.value)
											}
											placeholder="For example: next month or flexible"
											value={values.timeline}
										/>
									</div>

									<div>
										<Label htmlFor="estimate-details">Project details *</Label>
										<Textarea
											aria-invalid={Boolean(errors.details)}
											className="mt-2 min-h-32"
											id="estimate-details"
											onChange={(event) =>
												update("details", event.target.value)
											}
											placeholder="Rooms or exterior areas, surfaces, current condition, prep needs, colors, and anything else the painter should know."
											value={values.details}
										/>
										<FieldError message={errors.details} />
									</div>
								</CardContent>
								<CardFooter className="flex-col items-stretch gap-3 bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
									<p className="max-w-md text-muted-foreground text-xs leading-5">
										Next, you will review a clearly marked email draft. Nothing
										is sent or scheduled automatically.
									</p>
									<Button className="sm:min-w-40" size="lg" type="submit">
										Prepare request
										<ArrowRight data-icon="inline-end" />
									</Button>
								</CardFooter>
							</form>
						)}
					</Card>
				</div>
			</section>
		</main>
	);
}

function PreparedHandoff({
	href,
	onEdit,
}: {
	href: string;
	onEdit: () => void;
}) {
	return (
		<>
			<CardContent className="py-8">
				<div className="mx-auto max-w-xl border border-primary/30 bg-primary/5 p-6">
					<div className="flex items-start gap-4">
						<div className="flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
							<ClipboardCheck aria-hidden="true" className="size-5" />
						</div>
						<div>
							<p className="font-semibold text-lg">
								Your request is prepared, not sent.
							</p>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								Open the draft in your email app, add your contractor's email
								address, and send it. The contractor must still confirm receipt,
								scope, price, and availability. No appointment is held.
							</p>
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex-col gap-3 bg-muted/30 sm:flex-row sm:justify-between">
				<Button onClick={onEdit} type="button" variant="outline">
					Edit details
				</Button>
				<Button render={<a href={href} />} size="lg">
					<Mail data-icon="inline-start" />
					Open email draft
				</Button>
			</CardFooter>
		</>
	);
}
