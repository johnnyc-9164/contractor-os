import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { Pricing } from "@/components/pricing";
import { Testimonials } from "@/components/testimonials";

export default function Home() {
	return (
		<main>
			<Hero />
			<Pricing />
			<Testimonials />
			<Faq />
		</main>
	);
}
