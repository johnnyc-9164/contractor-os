import { Button } from "@contractor-os/ui/components/button";

// PLACEHOLDER — replace with the real business number in a later copy contract
const CALL_PHONE_DISPLAY = "(555) 010-0000";
// PLACEHOLDER — replace with the real business number in a later copy contract
const CALL_HREF = "tel:+15550100000";

export function Hero() {
	return (
		<section className="border-border border-b bg-background px-6 py-24 text-foreground sm:px-10">
			<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div>
					<p className="mb-5 text-muted-foreground text-sm">
						Built for the painting trade
					</p>
					<h1 className="max-w-xl text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
						Operations software for painting contractors
					</h1>
					<p className="mt-6 max-w-xl text-lg text-muted-foreground leading-8">
						Keep leads, active jobs, and invoices moving from one practical work
						surface. Final product copy is pending approval.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button
							className="w-full rounded-lg sm:w-auto"
							render={<a href={CALL_HREF} />}
							size="lg"
						>
							Call {CALL_PHONE_DISPLAY}
						</Button>
						<Button
							className="w-full rounded-lg sm:w-auto"
							render={<a href="#pricing" />}
							size="lg"
							variant="outline"
						>
							Review starting prices
						</Button>
					</div>
				</div>

				<div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-muted p-8 text-center text-muted-foreground">
					<p className="max-w-xs text-sm">Real job photography — placeholder</p>
				</div>
			</div>
		</section>
	);
}
