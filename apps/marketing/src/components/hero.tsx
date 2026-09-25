import { Button } from "@contractor-os/ui/components/button";
import Image from "next/image";

const CALL_PHONE_DISPLAY = "(651) 410-4196";
const CALL_HREF = "tel:+16514104196";

export function Hero() {
	return (
		<section className="bg-background px-6 py-24 text-foreground sm:px-10 lg:py-32">
			<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div>
					<p className="mb-5 text-muted-foreground text-sm">
						Twin Cities painting crew
					</p>
					<h1 className="max-w-xl text-balance font-semibold text-5xl tracking-tight sm:text-6xl">
						The crew that shows up and finishes.
					</h1>
					<p className="mt-6 max-w-xl text-lg text-muted-foreground leading-8">
						Call for a free walkthrough: we scope the work on site, then paint
						it right.
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

				<div className="relative overflow-hidden rounded-2xl">
					<Image
						alt="Sky's the Limit painter on a ladder cutting in second-story siding on a Twin Cities home"
						className="h-auto w-full object-cover"
						height={1122}
						priority
						sizes="(max-width: 1024px) 100vw, 50vw"
						src="/photos/hero.webp"
						width={1402}
					/>
				</div>
			</div>
		</section>
	);
}
