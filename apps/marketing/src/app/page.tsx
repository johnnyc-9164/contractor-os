import { Cta } from "@/components/cta";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { Pricing } from "@/components/pricing";

export default function Home() {
	return (
		<main>
			<Hero />
			<Pricing />
			<Cta />
			<Faq />
		</main>
	);
}
