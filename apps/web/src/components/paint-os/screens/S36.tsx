"use client";
import { Badge } from "@contractor-os/ui/components/badge";
import { Button } from "@contractor-os/ui/components/button";
import { Input } from "@contractor-os/ui/components/input";
import {
	Bot as BotIcon,
	Ellipsis as EllipsisIcon,
	FileSpreadsheet as FileSpreadsheetIcon,
	Flame as FlameIcon,
	ListFilter as ListFilterIcon,
	MessageCircle as MessageCircleIcon,
	MessagesSquare as MessagesSquareIcon,
	Search as SearchIcon,
	TrendingUp as TrendingUpIcon,
	X as XIcon,
} from "lucide-react";
import { makeBindings, type ScreenProps } from "../shared";
export type S36ActionId =
	| "s36:new-project"
	| "s36:overview"
	| "s36:leads"
	| "s36:projects"
	| "s36:revenue"
	| "s36:ai-settings"
	| "s36:settings"
	| "s36:support"
	| "s36:filter-list"
	| "s36:close"
	| "s36:dismiss"
	| "s36:convert-to-quote";
export type S36FieldId = "s36:search-leads";
export type S36SlotId =
	| "navigation"
	| "page-header"
	| "kanban-board"
	| "lead-details";
export type S36Props = ScreenProps<S36ActionId, S36FieldId, S36SlotId>;
export function S36LeadsContent(props: S36Props = {}) {
	const bindings = makeBindings(props);
	return (
		<div data-paintpro-root="" data-paintpro-screen="S36">
			<section className="pp:relative pp:flex pp:h-full pp:flex-1 pp:flex-col pp:overflow-hidden pp:pr-[480px]">
				{bindings.slot(
					"page-header",
					<header className="ambient-elevation-1 pp:z-10 pp:flex pp:h-20 pp:shrink-0 pp:items-center pp:justify-between pp:bg-surface pp:px-margin-desktop">
						<h2 className="pp:font-headline-lg pp:text-headline-lg pp:text-on-surface pp:md:font-headline-lg">
							{"Leads Pipeline"}
						</h2>
						<div className="pp:flex pp:items-center pp:gap-stack-md">
							<div className="pp:relative pp:hidden pp:sm:block">
								<SearchIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
								<Input
									placeholder="Search leads..."
									type="text"
									{...bindings.field("s36:search-leads", "")}
									data-paintpro-field="s36:search-leads"
									aria-label="Search leads..."
									className="pp:w-64 pp:rounded-full pp:border pp:py-2 pp:pr-4 pp:pl-10 pp:transition-all pp:focus:outline-hidden"
									id="s36:search-leads"
								/>
							</div>
							<Button
								{...bindings.button("s36:filter-list", "filter_list")}
								data-paintpro-action="s36:filter-list"
								className="pp:flex pp:h-10 pp:w-10 pp:items-center pp:justify-center pp:rounded-full pp:transition-colors"
								variant="ghost"
							>
								<ListFilterIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
							</Button>
						</div>
					</header>,
				)}
				{bindings.slot(
					"kanban-board",
					<div className="kanban-scroll pp:flex pp:flex-1 pp:gap-gutter pp:overflow-x-auto pp:overflow-y-hidden pp:p-margin-desktop">
						<div className="pp:flex pp:h-full pp:w-[340px] pp:shrink-0 pp:flex-col">
							<div className="pp:mb-stack-sm pp:flex pp:items-center pp:justify-between pp:px-2">
								<h3 className="pp:flex pp:items-center pp:gap-2 pp:font-label-md pp:text-label-md pp:text-secondary pp:uppercase pp:tracking-wider">
									<Badge
										className="pp:h-2 pp:w-2 pp:rounded-full"
										variant="default"
									/>
									{
										"\n                        New Inquiries\n                    "
									}
								</h3>
								<Badge
									className="pp:rounded-full pp:px-2 pp:py-1"
									variant="secondary"
								>
									{"3"}
								</Badge>
							</div>
							<div className="kanban-scroll pp:flex pp:flex-1 pp:flex-col pp:gap-stack-md pp:overflow-y-auto pp:pb-stack-lg">
								<div className="ambient-elevation-1 pp:group pp:flex pp:cursor-pointer pp:flex-col pp:gap-stack-sm pp:rounded-xl pp:border pp:border-transparent pp:bg-on-secondary pp:p-gutter pp:transition-all pp:hover:border-primary">
									<div className="pp:flex pp:items-start pp:justify-between">
										<h4 className="pp:font-headline-md pp:text-[18px] pp:text-on-surface pp:leading-tight">
											{"Sarah Jenkins"}
										</h4>
										<EllipsisIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
									</div>
									<p className="pp:font-body-md pp:text-body-md pp:text-on-surface-variant">
										{"Exterior Trim \u0026 Shutters"}
									</p>
									<div className="pp:mt-2 pp:flex pp:gap-2">
										<span className="pp:flex pp:items-center pp:gap-1 pp:rounded-full pp:bg-error-container pp:px-2 pp:py-1 pp:font-label-sm pp:text-label-sm pp:text-on-error-container">
											<FlameIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
											{" High Intent\n                            "}
										</span>
										<Badge
											className="pp:rounded-full pp:px-2 pp:py-1"
											variant="secondary"
										>
											{
												"\n                                Web Form\n                            "
											}
										</Badge>
									</div>
									<div className="pp:mt-4 pp:flex pp:items-center pp:justify-between pp:border-surface-variant pp:border-t pp:pt-4 pp:text-secondary">
										<span className="pp:font-label-sm pp:text-label-sm">
											{"2 hours ago"}
										</span>
										<div className="pp:flex pp:-space-x-2">
											<img
												data-alt="A small circular avatar showing a professional looking person in light mode style."
												src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3IV_bh9dD5n0IV-t480GfMtEEtiNR2TtBg_sSEommTTkgaNLZx2wTsrW5msWF39jN7ay5glKb3DWbMGUnsUWGvCr7ESwhgit2fmYtt2wTP28iLoq1Hp7tV64sb758IJ7pt6fG4JWqgsozMWBPQRcI9M42WZz_dLqc9ez9HRWdz14s2Dq7unM9yWhz2K5G9ZBQesAxi5up36suoebvGUujo70zytDwcVNmofI7uQdaL4jPAeu1NWZcyDAXjlWnY7T7ackeaV0KoVPa"
												className="pp:h-6 pp:w-6 pp:rounded-full pp:border-2 pp:border-on-secondary"
												alt=""
											/>
										</div>
									</div>
								</div>
								<div className="ambient-elevation-1 pp:group pp:flex pp:cursor-pointer pp:flex-col pp:gap-stack-sm pp:rounded-xl pp:border pp:border-transparent pp:bg-on-secondary pp:p-gutter pp:transition-all pp:hover:border-primary">
									<div className="pp:flex pp:items-start pp:justify-between">
										<h4 className="pp:font-headline-md pp:text-[18px] pp:text-on-surface pp:leading-tight">
											{"Marcus Thorne"}
										</h4>
										<EllipsisIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
									</div>
									<p className="pp:font-body-md pp:text-body-md pp:text-on-surface-variant">
										{"Full Interior (3 Rooms)"}
									</p>
									<div className="pp:mt-2 pp:flex pp:gap-2">
										<span className="pp:flex pp:items-center pp:gap-1 pp:rounded-full pp:bg-tertiary-fixed pp:px-2 pp:py-1 pp:font-label-sm pp:text-label-sm pp:text-on-tertiary-fixed">
											<TrendingUpIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
											{" Medium Intent\n                            "}
										</span>
									</div>
									<div className="pp:mt-4 pp:flex pp:items-center pp:justify-between pp:border-surface-variant pp:border-t pp:pt-4 pp:text-secondary">
										<span className="pp:font-label-sm pp:text-label-sm">
											{"5 hours ago"}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className="pp:flex pp:h-full pp:w-[340px] pp:shrink-0 pp:flex-col">
							<div className="pp:mb-stack-sm pp:flex pp:items-center pp:justify-between pp:px-2">
								<h3 className="pp:flex pp:items-center pp:gap-2 pp:font-label-md pp:text-label-md pp:text-secondary pp:uppercase pp:tracking-wider">
									<Badge
										className="pp:h-2 pp:w-2 pp:rounded-full"
										variant="secondary"
									/>
									{"\n                        Contacted\n                    "}
								</h3>
								<Badge
									className="pp:rounded-full pp:px-2 pp:py-1"
									variant="secondary"
								>
									{"1"}
								</Badge>
							</div>
							<div className="kanban-scroll pp:flex pp:flex-1 pp:flex-col pp:gap-stack-md pp:overflow-y-auto pp:pb-stack-lg">
								<div className="ambient-elevation-1 pp:flex pp:cursor-pointer pp:flex-col pp:gap-stack-sm pp:rounded-xl pp:border pp:border-primary pp:bg-on-secondary pp:p-gutter pp:ring-2 pp:ring-primary-container pp:transition-all">
									<div className="pp:flex pp:items-start pp:justify-between">
										<h4 className="pp:font-headline-md pp:text-[18px] pp:text-on-surface pp:leading-tight">
											{"Elena Rodriguez"}
										</h4>
										<EllipsisIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
									</div>
									<p className="pp:font-body-md pp:text-body-md pp:text-on-surface-variant">
										{"Kitchen Cabinets Refinishing"}
									</p>
									<div className="pp:mt-2 pp:flex pp:gap-2">
										<span className="pp:flex pp:items-center pp:gap-1 pp:rounded-full pp:bg-error-container pp:px-2 pp:py-1 pp:font-label-sm pp:text-label-sm pp:text-on-error-container">
											<FlameIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
											{" High Intent\n                            "}
										</span>
										<Badge
											className="pp:rounded-full pp:px-2 pp:py-1"
											variant="secondary"
										>
											{
												"\n                                AI Chat\n                            "
											}
										</Badge>
									</div>
									<div className="pp:mt-4 pp:flex pp:items-center pp:justify-between pp:border-surface-variant pp:border-t pp:pt-4 pp:text-secondary">
										<span className="pp:font-label-sm pp:text-label-sm">
											{"Yesterday"}
										</span>
										<span className="pp:flex pp:items-center pp:gap-1 pp:font-label-sm pp:text-label-sm pp:text-primary">
											<MessageCircleIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
											{" Active"}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className="pp:flex pp:h-full pp:w-[340px] pp:shrink-0 pp:flex-col">
							<div className="pp:mb-stack-sm pp:flex pp:items-center pp:justify-between pp:px-2">
								<h3 className="pp:flex pp:items-center pp:gap-2 pp:font-label-md pp:text-label-md pp:text-secondary pp:uppercase pp:tracking-wider">
									<Badge
										className="pp:h-2 pp:w-2 pp:rounded-full"
										variant="secondary"
									/>
									{"\n                        Estimating\n                    "}
								</h3>
								<Badge
									className="pp:rounded-full pp:px-2 pp:py-1"
									variant="secondary"
								>
									{"0"}
								</Badge>
							</div>
							<div className="pp:flex pp:flex-1 pp:items-center pp:justify-center pp:rounded-xl pp:border-2 pp:border-surface-variant pp:border-dashed pp:bg-surface-container-low/50">
								<p className="pp:px-4 pp:text-center pp:font-body-md pp:text-body-md pp:text-secondary">
									{"Drag leads here to start estimating"}
								</p>
							</div>
						</div>
					</div>,
				)}
				{bindings.slot(
					"lead-details",
					<aside className="ambient-elevation-2 pp:absolute pp:top-0 pp:right-0 pp:bottom-0 pp:z-20 pp:flex pp:w-[480px] pp:translate-x-0 pp:transform pp:flex-col pp:border-outline-variant pp:border-l pp:bg-on-secondary pp:transition-transform pp:duration-300">
						<div className="pp:flex pp:h-20 pp:shrink-0 pp:items-center pp:justify-between pp:border-surface-variant pp:border-b pp:bg-surface-bright pp:p-gutter">
							<div>
								<h3 className="pp:font-headline-md pp:text-headline-md pp:text-on-surface">
									{"Elena Rodriguez"}
								</h3>
								<p className="pp:font-body-md pp:text-body-md pp:text-secondary">
									{"Kitchen Cabinets Refinishing"}
								</p>
							</div>
							<Button
								{...bindings.button("s36:close", "close")}
								data-paintpro-action="s36:close"
								className="pp:rounded-full pp:p-2 pp:transition-colors"
								variant="ghost"
							>
								<XIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
							</Button>
						</div>
						<div className="pp:flex pp:flex-1 pp:flex-col pp:gap-stack-lg pp:overflow-y-auto pp:p-gutter">
							<div className="pp:grid pp:grid-cols-2 pp:gap-4">
								<div className="pp:rounded-lg pp:bg-surface-container-low pp:p-3">
									<span className="pp:mb-1 pp:block pp:font-label-sm pp:text-label-sm pp:text-secondary">
										{"Source"}
									</span>
									<span className="pp:flex pp:items-center pp:gap-2 pp:font-body-md pp:text-body-md pp:text-on-surface">
										<BotIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
										{" AI Chatbot"}
									</span>
								</div>
								<div className="pp:rounded-lg pp:bg-surface-container-low pp:p-3">
									<span className="pp:mb-1 pp:block pp:font-label-sm pp:text-label-sm pp:text-secondary">
										{"Sentiment"}
									</span>
									<span className="pp:flex pp:items-center pp:gap-2 pp:font-body-md pp:text-body-md pp:text-on-error-container">
										<FlameIcon
											aria-hidden={true}
											data-icon="inline-start"
											className="paint-os-icon"
										/>
										{" Ready to Buy"}
									</span>
								</div>
								<div className="pp:col-span-2 pp:rounded-lg pp:bg-surface-container-low pp:p-3">
									<span className="pp:mb-1 pp:block pp:font-label-sm pp:text-label-sm pp:text-secondary">
										{"AI Summary"}
									</span>
									<p className="pp:font-body-md pp:text-body-md pp:text-on-surface">
										{
											"Client wants to refinish dark oak cabinets to a bright white. Looking for a durable finish. Wants it done before Thanksgiving."
										}
									</p>
								</div>
							</div>
							<div>
								<h4 className="pp:mb-stack-md pp:flex pp:items-center pp:gap-2 pp:font-label-md pp:text-label-md pp:text-on-surface">
									<MessagesSquareIcon
										aria-hidden={true}
										data-icon="inline-start"
										className="paint-os-icon"
									/>
									{
										"\n                        Chat Transcript\n                    "
									}
								</h4>
								<div className="pp:flex pp:flex-col pp:gap-4 pp:rounded-xl pp:border pp:border-surface-variant pp:bg-surface-bright pp:p-4">
									<div className="pp:flex pp:max-w-[85%] pp:gap-3">
										<div className="pp:flex pp:h-8 pp:w-8 pp:shrink-0 pp:items-center pp:justify-center pp:rounded-full pp:bg-tertiary-fixed pp:font-label-md pp:text-on-tertiary-fixed">
											{"ER"}
										</div>
										<div className="pp:rounded-[12px] pp:rounded-tl-[4px] pp:bg-surface-container pp:p-3 pp:font-body-md pp:text-body-md pp:text-on-surface">
											{
												"\n                                Hi, I need a quote for painting my kitchen cabinets. They are currently dark wood and I want them white.\n                            "
											}
										</div>
									</div>
									<div className="pp:flex pp:max-w-[85%] pp:flex-row-reverse pp:gap-3 pp:self-end">
										<div className="pp:flex pp:h-8 pp:w-8 pp:shrink-0 pp:items-center pp:justify-center pp:rounded-full pp:bg-primary pp:text-on-primary">
											<BotIcon
												aria-hidden={true}
												data-icon="inline-start"
												className="paint-os-icon"
											/>
										</div>
										<div className="pp:rounded-[12px] pp:rounded-tr-[4px] pp:bg-primary pp:p-3 pp:font-body-md pp:text-body-md pp:text-on-primary">
											{
												"\n                                Hello Elena! We can definitely help with that. Cabinet refinishing is one of our specialties. Do you know roughly how many doors/drawers you have?\n                            "
											}
										</div>
									</div>
									<div className="pp:flex pp:max-w-[85%] pp:gap-3">
										<div className="pp:flex pp:h-8 pp:w-8 pp:shrink-0 pp:items-center pp:justify-center pp:rounded-full pp:bg-tertiary-fixed pp:font-label-md pp:text-on-tertiary-fixed">
											{"ER"}
										</div>
										<div className="pp:rounded-[12px] pp:rounded-tl-[4px] pp:bg-surface-container pp:p-3 pp:font-body-md pp:text-body-md pp:text-on-surface">
											{
												"\n                                About 25 doors and 10 drawers. I'd like it done before Thanksgiving if possible.\n                            "
											}
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="pp:flex pp:shrink-0 pp:gap-4 pp:border-surface-variant pp:border-t pp:bg-on-secondary pp:p-gutter">
							<Button
								{...bindings.button("s36:dismiss", "Dismiss")}
								data-paintpro-action="s36:dismiss"
								className="pp:flex-1 pp:rounded-lg pp:border pp:px-4 pp:py-3 pp:transition-colors"
								variant="outline"
							>
								{"\n                    Dismiss\n                "}
							</Button>
							<Button
								{...bindings.button("s36:convert-to-quote", "Convert to Quote")}
								data-paintpro-action="s36:convert-to-quote"
								className="pp:flex pp:flex-1 pp:items-center pp:justify-center pp:gap-2 pp:rounded-lg pp:px-4 pp:py-3 pp:transition-colors"
								variant="default"
							>
								<FileSpreadsheetIcon
									aria-hidden={true}
									data-icon="inline-start"
									className="paint-os-icon"
								/>
								{"\n                    Convert to Quote\n                "}
							</Button>
						</div>
					</aside>,
				)}
			</section>
		</div>
	);
}
