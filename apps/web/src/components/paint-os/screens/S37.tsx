"use client";
import { Badge } from "@contractor-os/ui/components/badge";
import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@contractor-os/ui/components/table";
import {
	ArrowRight as ArrowRightIcon,
	Bot as BotIcon,
	Calendar as CalendarIcon,
	ChevronRight as ChevronRightIcon,
	Clock as ClockIcon,
	Download as DownloadIcon,
	Ellipsis as EllipsisIcon,
	EllipsisVertical as EllipsisVerticalIcon,
	FileText as FileTextIcon,
	PaintRoller as PaintRollerIcon,
	ReceiptText as ReceiptTextIcon,
	Send as SendIcon,
	TrendingUp as TrendingUpIcon,
	UserPlus as UserPlusIcon,
	Wallet as WalletIcon,
} from "lucide-react";
import { makeBindings, type ScreenProps } from "../shared";
export type S37ActionId =
	| "s37:overview"
	| "s37:leads"
	| "s37:projects"
	| "s37:revenue"
	| "s37:ai-settings"
	| "s37:new-project"
	| "s37:settings"
	| "s37:support"
	| "s37:this-month"
	| "s37:export"
	| "s37:more-horiz"
	| "s37:create-estimate-draft-a-new-proposal"
	| "s37:schedule-crew-assign-painters-to-jobs"
	| "s37:send-invoice-bill-completed-projects"
	| "s37:view-all-actions"
	| "s37:view-all"
	| "s37:more-vert"
	| "s37:more-vert-2"
	| "s37:more-vert-3"
	| "s37:more-vert-4"
	| "s37:view-details";
export type S37FieldId = never;
export type S37SlotId =
	| "navigation"
	| "content-1"
	| "records-table"
	| "records-action";
export type S37Props = ScreenProps<S37ActionId, S37FieldId, S37SlotId>;
export function S37DashboardContent(props: S37Props = {}) {
	const bindings = makeBindings(props);
	const hasRecordsSlot =
		props.slots && Object.hasOwn(props.slots, "records-table");
	const viewAllActionsLink = bindings.link(
		"s37:view-all-actions",
		"View all actions",
		"#",
	);
	const viewAllActionsContent = (
		<>
			{"\n                                View all actions "}
			<ArrowRightIcon
				aria-hidden={true}
				data-icon="inline-start"
				className="paint-os-icon"
			/>
		</>
	);
	return (
		<div data-paintpro-root="" data-paintpro-screen="S37">
			<section className="pp:h-full pp:flex-1 pp:overflow-y-auto pp:scroll-smooth pp:bg-background pp:px-margin-desktop pp:py-stack-lg">
				{bindings.slot(
					"content-1",
					<div className="pp:mx-auto pp:flex pp:w-full pp:max-w-[1200px] pp:flex-col pp:gap-gutter">
						<header className="pp:mb-stack-sm pp:flex pp:items-end pp:justify-between">
							<div>
								<h1 className="pp:mb-unit pp:font-headline-lg pp:text-headline-lg pp:text-on-surface">
									{"Welcome back, Admin"}
								</h1>
								<p className="pp:font-body-md pp:text-body-md pp:text-on-surface-variant">
									{
										"Here's what's happening with your painting operations today."
									}
								</p>
							</div>
							<div className="pp:flex pp:gap-stack-sm">
								<Button
									{...bindings.button("s37:this-month", "This Month")}
									data-paintpro-action="s37:this-month"
									className="pp:flex pp:items-center pp:gap-2 pp:rounded-lg pp:border pp:px-4 pp:py-2 pp:transition-colors"
									variant="outline"
								>
									<CalendarIcon
										aria-hidden={true}
										data-icon="inline-start"
										className="paint-os-icon"
									/>
									{"\n                        This Month\n                    "}
								</Button>
								<Button
									{...bindings.button("s37:export", "Export")}
									data-paintpro-action="s37:export"
									className="pp:flex pp:items-center pp:gap-2 pp:rounded-lg pp:border pp:px-4 pp:py-2 pp:transition-colors"
									variant="outline"
								>
									<DownloadIcon
										aria-hidden={true}
										data-icon="inline-start"
										className="paint-os-icon"
									/>
									{"\n                        Export\n                    "}
								</Button>
							</div>
						</header>
						<div className="pp:grid pp:grid-cols-1 pp:gap-gutter pp:md:grid-cols-3">
							<Card
								className="pp:group pp:flex pp:border pp:transition-colors"
								data-paint-os-region="source-card"
							>
								<CardContent className="flex flex-col gap-4 p-6">
									<div className="pp:mb-stack-md pp:flex pp:items-start pp:justify-between">
										<span className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant pp:uppercase pp:tracking-wider">
											{"Total Revenue"}
										</span>
										<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-secondary-container pp:text-on-secondary-container">
											<WalletIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</div>
									</div>
									<div className="pp:mb-unit pp:font-display-lg pp:text-display-lg pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
										{"$124,500"}
									</div>
									<div className="pp:flex pp:items-center pp:gap-unit pp:font-label-md pp:text-label-md pp:text-primary">
										<TrendingUpIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
										<span>{"+12.5% from last month"}</span>
									</div>
								</CardContent>
							</Card>
							<Card
								className="pp:group pp:flex pp:border pp:transition-colors"
								data-paint-os-region="source-card"
							>
								<CardContent className="flex flex-col gap-4 p-6">
									<div className="pp:mb-stack-md pp:flex pp:items-start pp:justify-between">
										<span className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant pp:uppercase pp:tracking-wider">
											{"Active Projects"}
										</span>
										<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-primary-container pp:text-on-primary-container">
											<PaintRollerIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</div>
									</div>
									<div className="pp:mb-unit pp:font-display-lg pp:text-display-lg pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
										{"18"}
									</div>
									<div className="pp:flex pp:items-center pp:gap-unit pp:font-label-md pp:text-label-md pp:text-on-surface-variant">
										<ClockIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
										<span>{"4 pending completion"}</span>
									</div>
								</CardContent>
							</Card>
							<Card
								className="pp:group pp:flex pp:border pp:transition-colors"
								data-paint-os-region="source-card"
							>
								<CardContent className="flex flex-col gap-4 p-6">
									<div className="pp:mb-stack-md pp:flex pp:items-start pp:justify-between">
										<span className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant pp:uppercase pp:tracking-wider">
											{"New Leads"}
										</span>
										<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-tertiary-fixed pp:text-on-tertiary-fixed">
											<UserPlusIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</div>
									</div>
									<div className="pp:mb-unit pp:font-display-lg pp:text-display-lg pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
										{"42"}
									</div>
									<div className="pp:flex pp:items-center pp:gap-unit pp:font-label-md pp:text-label-md pp:text-primary">
										<TrendingUpIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
										<span>{"+5.2% conversion rate"}</span>
									</div>
								</CardContent>
							</Card>
						</div>
						<div className="pp:grid pp:grid-cols-1 pp:gap-gutter pp:lg:grid-cols-12">
							<Card
								className="pp:flex pp:border pp:lg:col-span-8"
								data-paint-os-region="source-card"
							>
								<CardHeader className="flex flex-row items-center justify-between gap-4 p-6 pb-3">
									<CardTitle role="heading" aria-level={2}>
										{"Revenue Overview"}
									</CardTitle>
									<Button
										{...bindings.button("s37:more-horiz", "more_horiz")}
										data-paintpro-action="s37:more-horiz"
										className="pp:transition-colors"
										variant="ghost"
									>
										<EllipsisIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
									</Button>
								</CardHeader>
								<CardContent className="flex flex-col gap-4 p-6">
									<div className="pp:relative pp:flex pp:min-h-[300px] pp:w-full pp:flex-1 pp:items-end pp:justify-between pp:gap-2 pp:border-outline-variant/50 pp:border-b pp:px-stack-md pp:pb-stack-lg">
										<div className="pp:absolute pp:top-0 pp:left-0 pp:flex pp:h-full pp:flex-col pp:justify-between pp:pb-stack-lg pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant pp:opacity-60">
											<span>{"$40k"}</span>
											<span>{"$30k"}</span>
											<span>{"$20k"}</span>
											<span>{"$10k"}</span>
											<span>{"$0"}</span>
										</div>
										<div className="pp:absolute pp:inset-0 pp:z-10 pp:flex pp:h-full pp:w-full pp:items-end pp:justify-between pp:gap-unit pp:pb-stack-lg pp:pl-12">
											<div className="pp:group pp:relative pp:h-[40%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-surface-variant pp:transition-colors pp:hover:bg-secondary-container" />
											<div className="pp:group pp:relative pp:h-[65%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-surface-variant pp:transition-colors pp:hover:bg-secondary-container" />
											<div className="pp:group pp:relative pp:h-[50%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-surface-variant pp:transition-colors pp:hover:bg-secondary-container" />
											<div className="pp:group pp:relative pp:h-[80%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-surface-variant pp:transition-colors pp:hover:bg-secondary-container" />
											<div className="pp:relative pp:h-[95%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-primary pp:shadow-[0_0_15px_rgba(0,62,199,0.3)] pp:transition-transform pp:hover:scale-[1.02]">
												<div className="pp:pointer-events-none pp:absolute pp:-top-12 pp:left-1/2 pp:-translate-x-1/2 pp:whitespace-nowrap pp:rounded pp:bg-inverse-surface pp:px-3 pp:py-1 pp:font-label-sm pp:text-inverse-on-surface pp:text-label-sm pp:opacity-0 pp:transition-opacity pp:group-hover:opacity-100">
													{
														"\n                                    May: $38,500\n                                "
													}
												</div>
											</div>
											<div className="pp:group pp:relative pp:h-[60%] pp:w-full pp:cursor-pointer pp:rounded-t-sm pp:bg-surface-variant pp:transition-colors pp:hover:bg-secondary-container" />
										</div>
										<div className="pp:absolute pp:bottom-0 pp:left-0 pp:flex pp:w-full pp:justify-between pp:pt-2 pp:pl-12 pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
											<span className="pp:w-full pp:text-center">{"Jan"}</span>
											<span className="pp:w-full pp:text-center">{"Feb"}</span>
											<span className="pp:w-full pp:text-center">{"Mar"}</span>
											<span className="pp:w-full pp:text-center">{"Apr"}</span>
											<span className="pp:w-full pp:text-center pp:font-bold pp:text-primary">
												{"May"}
											</span>
											<span className="pp:w-full pp:text-center">{"Jun"}</span>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card
								className="pp:flex pp:border pp:lg:col-span-4"
								data-paint-os-region="source-card"
							>
								<CardHeader className="flex flex-row items-center justify-between gap-4 p-6 pb-3">
									<CardTitle role="heading" aria-level={2}>
										{"Quick Actions"}
									</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col gap-4 p-6">
									<div className="pp:flex pp:flex-1 pp:flex-col pp:gap-stack-md">
										<Button
											{...bindings.button(
												"s37:create-estimate-draft-a-new-proposal",
												"Create Estimate Draft a new proposal",
											)}
											data-paintpro-action="s37:create-estimate-draft-a-new-proposal"
											variant="outline"
											className="pp:hover:ambient-shadow-1 pp:group pp:flex h-auto pp:w-full pp:items-center pp:justify-between pp:rounded-xl pp:border pp:p-4 pp:transition-all"
										>
											<div className="pp:flex pp:items-center pp:gap-stack-md">
												<div className="pp:flex pp:h-10 pp:w-10 pp:items-center pp:justify-center pp:rounded-full pp:bg-primary-container pp:text-on-primary-container">
													<FileTextIcon
														aria-hidden={true}
														data-icon="inline-start"
														className="paint-os-icon"
													/>
												</div>
												<div>
													<h3 className="pp:font-label-md pp:text-label-md pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
														{"Create Estimate"}
													</h3>
													<p className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
														{"Draft a new proposal"}
													</p>
												</div>
											</div>
											<ChevronRightIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</Button>
										<Button
											{...bindings.button(
												"s37:schedule-crew-assign-painters-to-jobs",
												"Schedule Crew Assign painters to jobs",
											)}
											data-paintpro-action="s37:schedule-crew-assign-painters-to-jobs"
											variant="outline"
											className="pp:hover:ambient-shadow-1 pp:group pp:flex h-auto pp:w-full pp:items-center pp:justify-between pp:rounded-xl pp:border pp:p-4 pp:transition-all"
										>
											<div className="pp:flex pp:items-center pp:gap-stack-md">
												<div className="pp:flex pp:h-10 pp:w-10 pp:items-center pp:justify-center pp:rounded-full pp:bg-tertiary-fixed pp:text-on-tertiary-fixed">
													<SendIcon
														aria-hidden={true}
														data-icon="inline-start"
														className="paint-os-icon"
													/>
												</div>
												<div>
													<h3 className="pp:font-label-md pp:text-label-md pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
														{"Schedule Crew"}
													</h3>
													<p className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
														{"Assign painters to jobs"}
													</p>
												</div>
											</div>
											<ChevronRightIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</Button>
										<Button
											{...bindings.button(
												"s37:send-invoice-bill-completed-projects",
												"Send Invoice Bill completed projects",
											)}
											data-paintpro-action="s37:send-invoice-bill-completed-projects"
											variant="outline"
											className="pp:hover:ambient-shadow-1 pp:group pp:flex h-auto pp:w-full pp:items-center pp:justify-between pp:rounded-xl pp:border pp:p-4 pp:transition-all"
										>
											<div className="pp:flex pp:items-center pp:gap-stack-md">
												<div className="pp:flex pp:h-10 pp:w-10 pp:items-center pp:justify-center pp:rounded-full pp:bg-secondary-container pp:text-on-secondary-container">
													<ReceiptTextIcon
														aria-hidden={true}
														data-icon="inline-start"
														className="paint-os-icon"
													/>
												</div>
												<div>
													<h3 className="pp:font-label-md pp:text-label-md pp:text-on-surface pp:transition-colors pp:group-hover:text-primary">
														{"Send Invoice"}
													</h3>
													<p className="pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
														{"Bill completed projects"}
													</p>
												</div>
											</div>
											<ChevronRightIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</Button>
										<div className="pp:mt-auto pp:border-outline-variant/30 pp:border-t pp:pt-stack-md">
											{props.handlers?.["s37:view-all-actions"] &&
											!viewAllActionsLink.href ? (
												<button
													className="pp:flex pp:items-center pp:gap-1 pp:font-label-md pp:text-label-md pp:text-primary pp:hover:underline"
													{...bindings.button(
														"s37:view-all-actions",
														"View all actions",
													)}
													data-paintpro-action="s37:view-all-actions"
												>
													{viewAllActionsContent}
												</button>
											) : (
												<a
													className="pp:flex pp:items-center pp:gap-1 pp:font-label-md pp:text-label-md pp:text-primary pp:hover:underline"
													{...viewAllActionsLink}
													data-paintpro-action="s37:view-all-actions"
												>
													{viewAllActionsContent}
												</a>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
						<Card
							className="pp:overflow-hidden pp:border"
							data-paint-os-region="source-card"
						>
							<CardHeader
								className={
									hasRecordsSlot
										? "flex flex-row items-center justify-between gap-4 border-border/30 border-b p-6 [--card-spacing:--spacing(6)]"
										: "flex flex-row items-center justify-between gap-4 p-6 pb-3"
								}
							>
								<CardTitle role="heading" aria-level={2}>
									{"Recent Leads"}
								</CardTitle>
								{bindings.slot(
									"records-action",
									<Button
										{...bindings.button("s37:view-all", "View All")}
										data-paintpro-action="s37:view-all"
										className="pp:flex pp:items-center pp:gap-1 pp:hover:underline"
										variant="ghost"
									>
										{"\n                        View All\n                    "}
									</Button>,
								)}
							</CardHeader>
							<CardContent
								className={
									hasRecordsSlot ? "min-w-0 p-0" : "flex flex-col gap-4 p-6"
								}
							>
								<div
									className={
										hasRecordsSlot ? "min-w-0" : "pp:w-full pp:overflow-x-auto"
									}
								>
									{bindings.slot(
										"records-table",
										<Table className="pp:w-full pp:min-w-[800px]">
											<TableHeader>
												<TableRow className="pp:uppercase pp:tracking-wider">
													<TableHead className="pp:p-4">
														{"Client Name"}
													</TableHead>
													<TableHead className="pp:p-4">
														{"Project Type"}
													</TableHead>
													<TableHead className="pp:p-4">
														{"Date Added"}
													</TableHead>
													<TableHead className="pp:p-4">
														{"Est. Value"}
													</TableHead>
													<TableHead className="pp:p-4">{"Status"}</TableHead>
													<TableHead className="pp:p-4">{"Action"}</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												<TableRow className="pp:group pp:transition-colors pp:last:border-0">
													<TableCell className="pp:p-4">
														<div className="pp:flex pp:items-center pp:gap-3">
															<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-tertiary-fixed pp:font-bold pp:font-label-md pp:text-on-tertiary-fixed">
																{"ES"}
															</div>
															<span className="pp:font-medium">
																{"Eleanor Shellstrop"}
															</span>
														</div>
													</TableCell>
													<TableCell className="pp:p-4">
														{"Exterior Residential"}
													</TableCell>
													<TableCell className="pp:p-4">
														{"Today, 10:42 AM"}
													</TableCell>
													<TableCell className="pp:p-4">{"$4,500"}</TableCell>
													<TableCell className="pp:p-4">
														<Badge
															className="pp:inline-flex pp:items-center pp:rounded-full pp:px-2.5 pp:py-0.5"
															variant="default"
														>
															{
																"\n                                        New\n                                    "
															}
														</Badge>
													</TableCell>
													<TableCell className="pp:p-4">
														<Button
															{...bindings.button("s37:more-vert", "more_vert")}
															data-paintpro-action="s37:more-vert"
															className="pp:rounded-full pp:p-1 pp:transition-colors"
															variant="ghost"
														>
															<EllipsisVerticalIcon
																aria-hidden={true}
																data-icon="inline-start"
																className="paint-os-icon"
															/>
														</Button>
													</TableCell>
												</TableRow>
												<TableRow className="pp:group pp:transition-colors pp:last:border-0">
													<TableCell className="pp:p-4">
														<div className="pp:flex pp:items-center pp:gap-3">
															<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-secondary-container pp:font-bold pp:font-label-md pp:text-on-secondary-container">
																{"CD"}
															</div>
															<span className="pp:font-medium">
																{"Chidi Anagonye"}
															</span>
														</div>
													</TableCell>
													<TableCell className="pp:p-4">
														{"Interior Commercial"}
													</TableCell>
													<TableCell className="pp:p-4">
														{"Yesterday"}
													</TableCell>
													<TableCell className="pp:p-4">{"$12,000"}</TableCell>
													<TableCell className="pp:p-4">
														<Badge
															className="pp:inline-flex pp:items-center pp:rounded-full pp:px-2.5 pp:py-0.5"
															variant="secondary"
														>
															{
																"\n                                        Quoted\n                                    "
															}
														</Badge>
													</TableCell>
													<TableCell className="pp:p-4">
														<Button
															{...bindings.button(
																"s37:more-vert-2",
																"more_vert",
															)}
															data-paintpro-action="s37:more-vert-2"
															className="pp:rounded-full pp:p-1 pp:transition-colors"
															variant="ghost"
														>
															<EllipsisVerticalIcon
																aria-hidden={true}
																data-icon="inline-start"
																className="paint-os-icon"
															/>
														</Button>
													</TableCell>
												</TableRow>
												<TableRow className="pp:group pp:transition-colors pp:last:border-0">
													<TableCell className="pp:p-4">
														<div className="pp:flex pp:items-center pp:gap-3">
															<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-primary-container pp:font-bold pp:font-label-md pp:text-on-primary-container">
																{"TA"}
															</div>
															<span className="pp:font-medium">
																{"Tahani Al-Jamil"}
															</span>
														</div>
													</TableCell>
													<TableCell className="pp:p-4">
														{"Cabinet Refinishing"}
													</TableCell>
													<TableCell className="pp:p-4">
														{"Oct 12, 2023"}
													</TableCell>
													<TableCell className="pp:p-4">{"$2,800"}</TableCell>
													<TableCell className="pp:p-4">
														<Badge
															className="pp:inline-flex pp:items-center pp:rounded-full pp:px-2.5 pp:py-0.5"
															variant="secondary"
														>
															{
																"\n                                        Won\n                                    "
															}
														</Badge>
													</TableCell>
													<TableCell className="pp:p-4">
														<Button
															{...bindings.button(
																"s37:more-vert-3",
																"more_vert",
															)}
															data-paintpro-action="s37:more-vert-3"
															className="pp:rounded-full pp:p-1 pp:transition-colors"
															variant="ghost"
														>
															<EllipsisVerticalIcon
																aria-hidden={true}
																data-icon="inline-start"
																className="paint-os-icon"
															/>
														</Button>
													</TableCell>
												</TableRow>
												<TableRow className="pp:group pp:transition-colors pp:last:border-0">
													<TableCell className="pp:p-4">
														<div className="pp:flex pp:items-center pp:gap-3">
															<div className="pp:flex pp:h-8 pp:w-8 pp:items-center pp:justify-center pp:rounded-full pp:bg-surface-variant pp:font-bold pp:font-label-md pp:text-on-surface">
																{"JM"}
															</div>
															<span className="pp:font-medium">
																{"Jason Mendoza"}
															</span>
														</div>
													</TableCell>
													<TableCell className="pp:p-4">
														{"Deck Staining"}
													</TableCell>
													<TableCell className="pp:p-4">
														{"Oct 10, 2023"}
													</TableCell>
													<TableCell className="pp:p-4">{"$1,200"}</TableCell>
													<TableCell className="pp:p-4">
														<Badge
															className="pp:inline-flex pp:items-center pp:rounded-full pp:px-2.5 pp:py-0.5"
															variant="secondary"
														>
															{
																"\n                                        Quoted\n                                    "
															}
														</Badge>
													</TableCell>
													<TableCell className="pp:p-4">
														<Button
															{...bindings.button(
																"s37:more-vert-4",
																"more_vert",
															)}
															data-paintpro-action="s37:more-vert-4"
															className="pp:rounded-full pp:p-1 pp:transition-colors"
															variant="ghost"
														>
															<EllipsisVerticalIcon
																aria-hidden={true}
																data-icon="inline-start"
																className="paint-os-icon"
															/>
														</Button>
													</TableCell>
												</TableRow>
											</TableBody>
										</Table>,
									)}
								</div>
							</CardContent>
						</Card>
						<div className="ambient-shadow-1 pp:mt-gutter pp:flex pp:items-center pp:justify-between pp:rounded-[16px] pp:border pp:border-outline-variant/30 pp:bg-gradient-to-r pp:from-tertiary-fixed pp:to-secondary-container pp:p-stack-lg">
							<div className="pp:flex pp:items-center pp:gap-stack-md">
								<div className="ambient-shadow-1 pp:flex pp:h-12 pp:w-12 pp:items-center pp:justify-center pp:rounded-full pp:bg-surface-container-lowest pp:text-primary">
									<BotIcon
										aria-hidden={true}
										data-icon="inline-start"
										className="paint-os-icon"
									/>
								</div>
								<div>
									<h3 className="pp:font-headline-md pp:text-headline-md pp:text-on-surface">
										{"AI Assistant Performance"}
									</h3>
									<p className="pp:font-body-md pp:text-body-md pp:text-on-surface-variant">
										{
											"Your AI handled 14 incoming inquiries and generated 3 automated quotes today."
										}
									</p>
								</div>
							</div>
							<Button
								{...bindings.button("s37:view-details", "View Details")}
								data-paintpro-action="s37:view-details"
								className="pp:flex pp:items-center pp:gap-2 pp:rounded-lg pp:px-4 pp:py-2 pp:transition-colors"
								variant="default"
							>
								{"\n                        View Details\n                    "}
							</Button>
						</div>
					</div>,
				)}
			</section>
		</div>
	);
}
