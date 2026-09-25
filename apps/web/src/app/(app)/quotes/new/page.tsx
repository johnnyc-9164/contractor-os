"use client";

import { Button } from "@contractor-os/ui/components/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QuoteWizardGuard } from "@/components/quotes/quote-wizard";

function NewQuoteContent() {
	const searchParams = useSearchParams();
	const leadId = searchParams.get("lead_id");

	if (!leadId) {
		return (
			<div className="mx-auto max-w-2xl py-24 text-center">
				<h1 className="font-semibold text-xl">No lead selected</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Open a lead first, then start a quote from its detail page.
				</p>
				<Link className="mt-6 inline-block" href="/leads">
					<Button variant="outline">Back to leads</Button>
				</Link>
			</div>
		);
	}

	return <QuoteWizardGuard leadId={leadId} />;
}

export default function NewQuotePage() {
	return (
		<Suspense
			fallback={
				<p className="py-24 text-center text-muted-foreground text-sm">
					Loading…
				</p>
			}
		>
			<NewQuoteContent />
		</Suspense>
	);
}
