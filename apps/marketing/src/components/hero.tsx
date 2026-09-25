import { Button } from "@contractor-os/ui/components/button";

const CALL_PHONE_DISPLAY = "(651) 410-4196";
const CALL_HREF = "tel:+16514104196";

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
						surface.
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

				<div
					aria-label="How the work moves: lead to job to invoice"
					className="rounded-2xl border border-border bg-muted p-8"
					role="img"
				>
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between rounded-lg bg-background px-5 py-4">
							<span className="font-medium">Lead</span>
							<span className="rounded-full bg-foreground px-3 py-1 text-background text-xs">
								New
							</span>
						</div>
						<div className="flex items-center justify-between rounded-lg bg-background px-5 py-4">
							<span className="font-medium">Job</span>
							<span className="rounded-full bg-foreground px-3 py-1 text-background text-xs">
								In progress
							</span>
						</div>
						<div className="flex items-center justify-between rounded-lg bg-background px-5 py-4">
							<span className="font-medium">Invoice</span>
							<span className="rounded-full bg-foreground px-3 py-1 text-background text-xs">
								Sent
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
