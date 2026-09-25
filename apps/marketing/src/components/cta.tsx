import { Button } from "@contractor-os/ui/components/button";

// PLACEHOLDER — replace with the real business number in a later copy contract
const CALL_PHONE_DISPLAY = "(555) 010-0000";
// PLACEHOLDER — replace with the real business number in a later copy contract
const CALL_HREF = "tel:+15550100000";

export function Cta() {
	return (
		<section className="border-border border-b bg-background px-6 py-20 text-foreground sm:px-10">
			<div className="mx-auto max-w-6xl">
				<div className="rounded-2xl bg-foreground p-8 text-background md:p-12 lg:p-16">
					<div className="flex flex-col items-start gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
						<div>
							<h2 className="max-w-2xl text-balance font-semibold text-3xl tracking-tight md:text-4xl">
								Call for a free walkthrough
							</h2>
							<p className="mt-4 max-w-2xl text-background/70 leading-7">
								Service-area details are pending approved business copy. Call to
								discuss the job and confirm availability.
							</p>
						</div>
						<Button
							className="w-full rounded-lg bg-background text-foreground hover:bg-background/90 sm:w-auto"
							render={<a href={CALL_HREF} />}
							size="lg"
							variant="secondary"
						>
							Call {CALL_PHONE_DISPLAY}
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
