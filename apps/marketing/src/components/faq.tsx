"use client";

import { useState } from "react";

const questions = [
	{
		question: "Which service areas will be covered?",
		answer:
			"Approved service-area copy will be added in a later copy contract.",
	},
	{
		question: "How will a walkthrough be scheduled?",
		answer:
			"Approved scheduling details will be added in a later copy contract.",
	},
	{
		question: "What information is needed before an estimate?",
		answer: "Approved estimate-preparation guidance is pending.",
	},
	{
		question: "What kinds of painting work can be discussed?",
		answer: "Approved residential and commercial service details are pending.",
	},
	{
		question: "When will final project terms be available?",
		answer: "Approved project terms will be added in a later copy contract.",
	},
] as const;

export function Faq() {
	const [openItem, setOpenItem] = useState<number | null>(null);

	return (
		<section className="bg-muted px-6 py-20 text-foreground sm:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="font-semibold text-3xl tracking-tight">
					Frequently asked questions
				</h2>
				<p className="mt-4 max-w-2xl text-muted-foreground leading-7">
					Final answers are awaiting approved business copy.
				</p>
				<div className="mt-10 max-w-3xl border-border border-t">
					{questions.map((item, index) => {
						const isOpen = openItem === index;
						const panelId = `faq-panel-${index}`;

						return (
							<div className="border-border border-b" key={item.question}>
								<h3>
									<button
										aria-controls={panelId}
										aria-expanded={isOpen}
										className="flex w-full items-center justify-between gap-6 rounded-lg py-6 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={() => setOpenItem(isOpen ? null : index)}
										type="button"
									>
										<span>{item.question}</span>
										<span aria-hidden="true" className="text-muted-foreground">
											{isOpen ? "−" : "+"}
										</span>
									</button>
								</h3>
								{isOpen ? (
									<div
										className="pb-6 text-muted-foreground leading-7"
										id={panelId}
									>
										{item.answer}
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
