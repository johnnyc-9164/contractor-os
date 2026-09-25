const tiers = [
	{ name: "Single-room repaint", price: "From $999" },
	{ name: "Whole-home interior", price: "From $2,499" },
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
			className="border-border border-b bg-muted px-6 py-20 text-foreground sm:px-10"
			id="pricing"
		>
			<div className="mx-auto max-w-6xl">
				<h2 className="font-semibold text-3xl tracking-tight">
					Starting points for the job
				</h2>
				<p className="mt-4 max-w-2xl text-muted-foreground leading-7">
					These anchors help sort the scope before a walkthrough. Final pricing
					depends on the surfaces and work confirmed on site.
				</p>
				<div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card">
					<table className="w-full min-w-3xl border-collapse text-left text-card-foreground">
						<thead>
							<tr className="border-border border-b">
								<th
									className="w-1/4 p-6 font-medium text-muted-foreground text-sm"
									scope="col"
								>
									Compare the work
								</th>
								{tiers.map((tier) => (
									<th
										className="w-1/4 p-6 align-top"
										key={tier.name}
										scope="col"
									>
										<span className="block font-medium text-sm">
											{tier.name}
										</span>
										<span className="mt-2 block font-semibold text-2xl tracking-tight">
											{tier.price}
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{features.map((feature) => (
								<tr
									className="border-border border-b last:border-b-0"
									key={feature.label}
								>
									<th className="p-6 font-medium text-sm" scope="row">
										{feature.label}
									</th>
									{feature.values.map((value) => (
										<td
											className="p-6 text-muted-foreground text-sm leading-6"
											key={value}
										>
											{value}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
