"use client";
import { Button } from "@contractor-os/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@contractor-os/ui/components/card";
import { Field, FieldLabel } from "@contractor-os/ui/components/field";
import { Input } from "@contractor-os/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@contractor-os/ui/components/native-select";
import { Separator } from "@contractor-os/ui/components/separator";
import { Switch } from "@contractor-os/ui/components/switch";
import { Textarea } from "@contractor-os/ui/components/textarea";
import {
	ChevronDown as ChevronDownIcon,
	CirclePlus as CirclePlusIcon,
	Menu as MenuIcon,
	Plus as PlusIcon,
	Send as SendIcon,
	Trash2 as Trash2Icon,
	X as XIcon,
} from "lucide-react";
import { makeBindings, type ScreenProps } from "../shared";
export type S12ActionId =
	| "s12:new-project"
	| "s12:overview"
	| "s12:projects"
	| "s12:leads"
	| "s12:revenue"
	| "s12:ai-settings"
	| "s12:settings"
	| "s12:support"
	| "s12:menu"
	| "s12:save-as-draft"
	| "s12:send-to-client"
	| "s12:add-group"
	| "s12:delete"
	| "s12:close"
	| "s12:close-2"
	| "s12:add-line-item";
export type S12FieldId =
	| "s12:select"
	| "s12:e-g-interior-repaint-main-floor"
	| "s12:text"
	| "s12:text-2"
	| "s12:number"
	| "s12:number-2"
	| "s12:text-3"
	| "s12:number-3"
	| "s12:number-4"
	| "s12:thank-you-for-considering-paintpro-for-your-upcoming-project"
	| "s12:checkbox"
	| "s12:number-5"
	| "s12:checkbox-2";
export type S12SlotId = "navigation" | "page-header" | "content-1";
export type S12Props = ScreenProps<S12ActionId, S12FieldId, S12SlotId>;
export function S12QuoteEditorContent(props: S12Props = {}) {
	const bindings = makeBindings(props);
	return (
		<div data-paintpro-root="" data-paintpro-screen="S12">
			<section className="pp:flex pp:min-h-screen pp:flex-1 pp:flex-col">
				{bindings.slot(
					"page-header",
					<header className="pp:sticky pp:top-0 pp:z-30 pp:flex pp:h-20 pp:items-center pp:justify-between pp:border-outline-variant/30 pp:border-b pp:bg-surface/80 pp:px-margin-desktop pp:backdrop-blur-md">
						<div className="pp:flex pp:items-center pp:gap-4">
							<Button
								{...bindings.button("s12:menu", "menu")}
								data-paintpro-action="s12:menu"
								className="pp:p-2 pp:md:hidden"
								variant="ghost"
							>
								<MenuIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
							</Button>
							<h2 className="pp:font-headline-lg pp:text-headline-lg-mobile pp:text-on-surface pp:md:text-headline-lg">
								{"Create New Quote"}
							</h2>
						</div>
						<div className="pp:flex pp:items-center pp:gap-3">
							<Button
								{...bindings.button("s12:save-as-draft", "Save as Draft")}
								data-paintpro-action="s12:save-as-draft"
								className="pp:rounded-lg pp:border pp:px-4 pp:py-2 pp:transition-colors"
								variant="outline"
							>
								{"Save as Draft"}
							</Button>
							<Button
								{...bindings.button("s12:send-to-client", "Send to Client")}
								data-paintpro-action="s12:send-to-client"
								className="pp:flex pp:items-center pp:gap-2 pp:rounded-lg pp:px-4 pp:py-2 pp:transition-colors"
								variant="default"
							>
								<SendIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
								{"\n                    Send to Client\n                "}
							</Button>
						</div>
					</header>,
				)}
				{bindings.slot(
					"content-1",
					<div className="pp:flex-1 pp:overflow-y-auto pp:p-margin-mobile pp:md:p-margin-desktop">
						<div className="pp:mx-auto pp:max-w-container-max">
							<div className="pp:grid pp:grid-cols-1 pp:items-start pp:gap-gutter pp:lg:grid-cols-12">
								<div className="pp:flex pp:flex-col pp:gap-gutter pp:lg:col-span-8">
									<Card
										className="pp:border pp:transition-colors"
										data-paint-os-region="source-card"
									>
										<CardHeader className="p-6 pb-3">
											<CardTitle
												className="pp:mb-stack-md pp:uppercase pp:tracking-wider"
												role="heading"
												aria-level={3}
											>
												{"Client Details"}
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col gap-4 p-6">
											<div className="pp:grid pp:grid-cols-1 pp:gap-stack-md pp:md:grid-cols-2">
												<div className="pp:flex pp:flex-col pp:gap-2">
													<FieldLabel>{"Select Client"}</FieldLabel>
													<div className="pp:relative">
														<NativeSelect
															{...bindings.select("s12:select", "")}
															data-paintpro-field="s12:select"
															aria-label="select"
															className="pp:w-full pp:appearance-none pp:rounded-lg pp:border pp:px-4 pp:py-3 pp:transition-all pp:focus:outline-hidden"
															id="s12:select"
														>
															<NativeSelectOption disabled={true} value="">
																{"Choose a client..."}
															</NativeSelectOption>
															<NativeSelectOption value="1">
																{"Sarah Jenkins - 124 Maple St"}
															</NativeSelectOption>
															<NativeSelectOption value="2">
																{"Thompson Real Estate"}
															</NativeSelectOption>
															<NativeSelectOption value="3">
																{"New Client (+)"}
															</NativeSelectOption>
														</NativeSelect>
														<ChevronDownIcon
															aria-hidden={true}
															data-icon="inline-start"
															className="paint-os-icon"
														/>
													</div>
												</div>
												<Field className="pp:flex pp:flex-col pp:gap-2">
													<FieldLabel htmlFor="s12:e-g-interior-repaint-main-floor">
														{"Project Name / Reference"}
													</FieldLabel>
													<Input
														placeholder="e.g. Interior Repaint - Main Floor"
														type="text"
														{...bindings.field(
															"s12:e-g-interior-repaint-main-floor",
															"",
														)}
														data-paintpro-field="s12:e-g-interior-repaint-main-floor"
														aria-label="e.g. Interior Repaint - Main Floor"
														className="pp:w-full pp:rounded-lg pp:border pp:px-4 pp:py-3 pp:transition-all pp:focus:outline-hidden"
														id="s12:e-g-interior-repaint-main-floor"
													/>
												</Field>
											</div>
										</CardContent>
									</Card>
									<Card
										className="pp:border"
										data-paint-os-region="source-card"
									>
										<CardHeader className="flex flex-row items-center justify-between gap-4 p-6 pb-3">
											<CardTitle
												className="pp:uppercase pp:tracking-wider"
												role="heading"
												aria-level={3}
											>
												{"Services \u0026 Materials"}
											</CardTitle>
											<Button
												{...bindings.button("s12:add-group", "Add Group")}
												data-paintpro-action="s12:add-group"
												className="pp:flex pp:items-center pp:gap-1 pp:hover:underline"
												variant="ghost"
											>
												<CirclePlusIcon
													aria-hidden={true}
													data-icon="inline-start"
													className="paint-os-icon"
												/>
												{" Add Group\n                                "}
											</Button>
										</CardHeader>
										<CardContent className="flex flex-col gap-4 p-6">
											<div className="pp:mb-stack-md pp:overflow-hidden pp:rounded-lg pp:border pp:border-outline-variant/30">
												<div className="pp:flex pp:items-center pp:justify-between pp:border-outline-variant/30 pp:border-b pp:bg-surface-container-low pp:px-4 pp:py-3">
													<Input
														type="text"
														{...bindings.field("s12:text", "Interior Painting")}
														data-paintpro-field="s12:text"
														aria-label="text"
														className="pp:w-1/2 pp:border-none pp:p-0"
														id="s12:text"
													/>
													<Button
														{...bindings.button("s12:delete", "delete")}
														data-paintpro-action="s12:delete"
														className="pp:transition-opacity"
														variant="ghost"
													>
														<Trash2Icon
															aria-hidden={true}
															data-icon="inline-start"
															className="paint-os-icon"
														/>
													</Button>
												</div>
												<div className="pp:flex pp:flex-col pp:gap-4 pp:p-4">
													<div className="pp:grid pp:hidden pp:grid-cols-12 pp:gap-4 pp:border-outline-variant/20 pp:border-b pp:pb-2 pp:md:grid">
														<div className="pp:col-span-5 pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
															{"Description"}
														</div>
														<div className="pp:col-span-2 pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
															{"Qty/SqFt"}
														</div>
														<div className="pp:col-span-2 pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
															{"Rate ($)"}
														</div>
														<div className="pp:col-span-2 pp:text-right pp:font-label-sm pp:text-label-sm pp:text-on-surface-variant">
															{"Amount"}
														</div>
														<div className="pp:col-span-1" />
													</div>
													<div className="pp:group pp:grid pp:grid-cols-1 pp:items-center pp:gap-4 pp:md:grid-cols-12">
														<div className="pp:md:col-span-5">
															<Input
																type="text"
																{...bindings.field(
																	"s12:text-2",
																	"Master Bedroom Painting",
																)}
																data-paintpro-field="s12:text-2"
																aria-label="text"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden"
																id="s12:text-2"
															/>
														</div>
														<div className="pp:md:col-span-2">
															<Input
																type="number"
																{...bindings.field("s12:number", "450")}
																data-paintpro-field="s12:number"
																aria-label="number"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden pp:md:text-left"
																id="s12:number"
															/>
														</div>
														<div className="pp:md:col-span-2">
															<Input
																step="0.01"
																type="number"
																{...bindings.field("s12:number-2", "1.50")}
																data-paintpro-field="s12:number-2"
																aria-label="number"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden pp:md:text-left"
																id="s12:number-2"
															/>
														</div>
														<div className="pp:text-right pp:font-label-md pp:text-label-md pp:text-on-surface pp:md:col-span-2">
															{
																"\n                                            $675.00\n                                        "
															}
														</div>
														<div className="pp:flex pp:justify-end pp:opacity-0 pp:transition-opacity pp:group-hover:opacity-100 pp:md:col-span-1">
															<Button
																{...bindings.button("s12:close", "close")}
																data-paintpro-action="s12:close"
																variant="ghost"
															>
																<XIcon
																	aria-hidden={true}
																	data-icon="inline-start"
																	className="paint-os-icon"
																/>
															</Button>
														</div>
													</div>
													<div className="pp:group pp:grid pp:grid-cols-1 pp:items-center pp:gap-4 pp:md:grid-cols-12">
														<div className="pp:md:col-span-5">
															<Input
																type="text"
																{...bindings.field(
																	"s12:text-3",
																	"Trim \u0026 Doors",
																)}
																data-paintpro-field="s12:text-3"
																aria-label="text"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden"
																id="s12:text-3"
															/>
														</div>
														<div className="pp:md:col-span-2">
															<Input
																type="number"
																{...bindings.field("s12:number-3", "1")}
																data-paintpro-field="s12:number-3"
																aria-label="number"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden pp:md:text-left"
																id="s12:number-3"
															/>
														</div>
														<div className="pp:md:col-span-2">
															<Input
																step="0.01"
																type="number"
																{...bindings.field("s12:number-4", "250.00")}
																data-paintpro-field="s12:number-4"
																aria-label="number"
																className="pp:w-full pp:rounded-md pp:border pp:px-3 pp:py-2 pp:transition-all pp:focus:outline-hidden pp:md:text-left"
																id="s12:number-4"
															/>
														</div>
														<div className="pp:text-right pp:font-label-md pp:text-label-md pp:text-on-surface pp:md:col-span-2">
															{
																"\n                                            $250.00\n                                        "
															}
														</div>
														<div className="pp:flex pp:justify-end pp:opacity-0 pp:transition-opacity pp:group-hover:opacity-100 pp:md:col-span-1">
															<Button
																{...bindings.button("s12:close-2", "close")}
																data-paintpro-action="s12:close-2"
																variant="ghost"
															>
																<XIcon
																	aria-hidden={true}
																	data-icon="inline-start"
																	className="paint-os-icon"
																/>
															</Button>
														</div>
													</div>
													<Button
														{...bindings.button(
															"s12:add-line-item",
															"Add Line Item",
														)}
														data-paintpro-action="s12:add-line-item"
														className="pp:mt-2 pp:flex pp:w-fit pp:items-center pp:gap-2 pp:transition-colors"
														variant="ghost"
													>
														<PlusIcon
															aria-hidden={true}
															data-icon="inline-start"
															className="paint-os-icon"
														/>
														{
															" Add Line Item\n                                    "
														}
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
									<Card
										className="pp:border pp:transition-colors"
										data-paint-os-region="source-card"
									>
										<CardHeader className="p-6 pb-3">
											<CardTitle
												className="pp:mb-stack-md pp:uppercase pp:tracking-wider"
												role="heading"
												aria-level={3}
											>
												{"Personal Note to Client"}
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col gap-4 p-6">
											<Textarea
												placeholder="Thank you for considering PaintPro for your upcoming project..."
												rows={4}
												{...bindings.field(
													"s12:thank-you-for-considering-paintpro-for-your-upcoming-project",
													"",
												)}
												data-paintpro-field="s12:thank-you-for-considering-paintpro-for-your-upcoming-project"
												aria-label="Thank you for considering PaintPro for your upcoming project..."
												className="pp:w-full pp:resize-none pp:rounded-lg pp:border pp:px-4 pp:py-3 pp:transition-all pp:focus:outline-hidden"
												id="s12:thank-you-for-considering-paintpro-for-your-upcoming-project"
											/>
										</CardContent>
									</Card>
								</div>
								<div className="pp:lg:col-span-4">
									<div className="pp:sticky pp:top-[104px] pp:flex pp:flex-col pp:gap-gutter">
										<div className="pp:relative pp:overflow-hidden pp:rounded-xl pp:border pp:border-primary/20 pp:bg-primary/5 pp:p-[24px] pp:shadow-xs">
											<div className="pp:pointer-events-none pp:absolute pp:-top-10 pp:-right-10 pp:h-32 pp:w-32 pp:rounded-full pp:bg-primary/10 pp:blur-2xl" />
											<h3 className="pp:mb-stack-md pp:font-label-sm pp:text-label-sm pp:text-primary pp:uppercase pp:tracking-wider">
												{"Quote Summary"}
											</h3>
											<div className="pp:mb-6 pp:flex pp:flex-col pp:gap-3">
												<div className="pp:flex pp:items-center pp:justify-between pp:font-body-md pp:text-on-surface">
													<span>{"Subtotal"}</span>
													<span>{"$925.00"}</span>
												</div>
												<div className="pp:flex pp:items-center pp:justify-between pp:font-body-md pp:text-on-surface">
													<span>{"Tax (8%)"}</span>
													<span>{"$74.00"}</span>
												</div>
												<div className="pp:flex pp:items-center pp:justify-between pp:font-body-md pp:text-on-surface-variant">
													<span className="pp:flex pp:cursor-pointer pp:items-center pp:gap-1 pp:hover:text-primary">
														<CirclePlusIcon
															aria-hidden={true}
															data-icon="inline-start"
															className="paint-os-icon"
														/>
														{" Add Discount"}
													</span>
													<span>{"--"}</span>
												</div>
											</div>
											<div className="pp:mt-2 pp:border-primary/20 pp:border-t pp:pt-4">
												<div className="pp:flex pp:items-end pp:justify-between">
													<span className="pp:font-label-md pp:text-label-md pp:text-on-surface">
														{"Estimated Total"}
													</span>
													<span className="pp:font-headline-md pp:text-headline-md pp:text-primary">
														{"$999.00"}
													</span>
												</div>
											</div>
										</div>
										<Card
											className="pp:border"
											data-paint-os-region="source-card"
										>
											<CardHeader className="p-6 pb-3">
												<CardTitle
													className="pp:mb-stack-md pp:uppercase pp:tracking-wider"
													role="heading"
													aria-level={3}
												>
													{"Settings"}
												</CardTitle>
											</CardHeader>
											<CardContent className="flex flex-col gap-4 p-6">
												<div className="pp:flex pp:flex-col pp:gap-4">
													<div className="pp:flex pp:items-center pp:justify-between">
														<span className="pp:font-body-md pp:text-on-surface">
															{"Require Deposit"}
														</span>
														<Switch
															{...bindings.checkedToggle("s12:checkbox", true)}
															data-paintpro-field="s12:checkbox"
															aria-label="checkbox"
															id="s12:checkbox"
														/>
													</div>
													<div className="pp:flex pp:flex-col pp:gap-2">
														<FieldLabel>{"Deposit Amount"}</FieldLabel>
														<div className="pp:relative">
															<span className="pp:absolute pp:top-1/2 pp:left-3 pp:-translate-y-1/2 pp:text-on-surface-variant">
																{"%"}
															</span>
															<Input
																type="number"
																{...bindings.field("s12:number-5", "30")}
																data-paintpro-field="s12:number-5"
																aria-label="number"
																className="pp:w-full pp:rounded-lg pp:border pp:py-2 pp:pr-4 pp:pl-8 pp:transition-all pp:focus:outline-hidden"
																id="s12:number-5"
															/>
														</div>
													</div>
													<Separator className="pp:my-2" />
													<div className="pp:flex pp:items-center pp:justify-between">
														<span className="pp:font-body-md pp:text-on-surface">
															{"Allow Online Sign"}
														</span>
														<Switch
															{...bindings.checkedToggle(
																"s12:checkbox-2",
																true,
															)}
															data-paintpro-field="s12:checkbox-2"
															aria-label="checkbox"
															id="s12:checkbox-2"
														/>
													</div>
												</div>
											</CardContent>
										</Card>
									</div>
								</div>
							</div>
						</div>
					</div>,
				)}
			</section>
		</div>
	);
}
