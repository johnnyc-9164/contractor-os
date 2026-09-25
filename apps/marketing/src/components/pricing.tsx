import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const tiers = [
	{ name: "Single-room repaint", price: "From $999" },
	{ name: "Whole-home interior", price: "From $2,499", featured: true },
	{ name: "Commercial or exterior", price: "Custom Quote" },
] as const;

const features = [
	{
		label: "Project fit",
		values: [
			"One room or focused interior area",
			"Multiple rooms across the home",
			"Commercial spaces or exterior work",
		],
	},
	{
		label: "Scope",
		values: [
			"Walls and agreed trim",
			"Interior surfaces priced to the walkthrough",
			"Site-specific scope built after review",
		],
	},
	{
		label: "Next step",
		values: [
			"Confirm the room and surface condition",
			"Walk the home and confirm room count",
			"Review access, surfaces, and job requirements",
		],
	},
] as const;

export function Pricing() {
	return (
		<section
			className="bg-background px-6 py-20 text-foreground sm:px-10 md:py-28"
			id="pricing"
		>
			<div className="mx-auto max-w-6xl">
				<h2 className="font-semibold text-3xl tracking-tight md:text-4xl">
					Starting points for the job
				</h2>
				<p className="mt-4 max-w-2xl text-base text-muted-foreground leading-7 md:text-lg">
					These anchors help sort the scope before a walkthrough. Final pricing
					depends on the surfaces and work confirmed on site.
				</p>

				{/* Comparison table: md and up */}
				<div className="mt-10 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
					<Table className="text-left">
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead
									className="w-1/4 whitespace-normal p-6 align-top font-medium text-muted-foreground text-sm"
									scope="col"
								>
									Compare the work
								</TableHead>
								{tiers.map((tier) => (
									<TableHead
										className={`w-1/4 whitespace-normal p-6 align-top ${
											"featured" in tier && tier.featured ? "bg-muted/40" : ""
										}`}
										key={tier.name}
										scope="col"
									>
										{"featured" in tier && tier.featured ? (
											<span className="block font-medium text-muted-foreground text-xs uppercase tracking-widest">
												Most common job
											</span>
										) : null}
										<span
											className={`mt-2 block font-medium text-sm ${
												"featured" in tier && tier.featured ? "mt-1" : ""
											}`}
										>
											{tier.name}
										</span>
										<span className="mt-2 block font-semibold text-2xl tracking-tight">
											{tier.price}
										</span>
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{features.map((feature) => (
								<TableRow key={feature.label}>
									<TableHead
										className="whitespace-normal p-6 align-top font-medium text-sm"
										scope="row"
									>
										{feature.label}
									</TableHead>
									{feature.values.map((value, i) => (
										<TableCell
											className={`whitespace-normal p-6 align-top text-muted-foreground text-sm leading-6 ${
												"featured" in tiers[i] && tiers[i].featured
													? "bg-muted/40"
													: ""
											}`}
											key={value}
										>
											{value}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Stacked tier blocks: below md */}
				<div className="mt-10 space-y-4 md:hidden">
					{tiers.map((tier, tierIndex) => (
						<article
							className={`rounded-2xl border p-6 ${
								"featured" in tier && tier.featured
									? "border-foreground/30 bg-card"
									: "border-border bg-card"
							}`}
							key={tier.name}
						>
							{"featured" in tier && tier.featured ? (
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
									Most common job
								</p>
							) : null}
							<h3 className="mt-1 font-medium text-base">{tier.name}</h3>
							<p className="mt-1 font-semibold text-2xl tracking-tight">
								{tier.price}
							</p>
							<dl className="mt-4 space-y-3 border-border border-t pt-4">
								{features.map((feature) => (
									<div key={feature.label}>
										<dt className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
											{feature.label}
										</dt>
										<dd className="mt-1 text-sm leading-6">
											{feature.values[tierIndex]}
										</dd>
									</div>
								))}
							</dl>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
