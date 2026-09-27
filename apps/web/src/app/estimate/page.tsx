import type { Metadata } from "next";
import { EstimateIntake } from "./estimate-intake";

export const metadata: Metadata = {
	title: "Request a paint estimate | PaintPro",
	description:
		"Prepare a clear painting project brief for a human scope and pricing review.",
};

export default function EstimatePage() {
	return <EstimateIntake />;
}
