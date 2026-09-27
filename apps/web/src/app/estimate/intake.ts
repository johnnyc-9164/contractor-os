export const PROJECT_TYPES = [
	"Interior painting",
	"Exterior painting",
	"Cabinet refinishing",
	"Commercial painting",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export type EstimateIntake = {
	name: string;
	email: string;
	phone: string;
	location: string;
	projectType: ProjectType | "";
	timeline: string;
	details: string;
};

export type EstimateIntakeField = keyof EstimateIntake | "contact";
export type EstimateIntakeErrors = Partial<Record<EstimateIntakeField, string>>;

export const EMPTY_ESTIMATE_INTAKE: EstimateIntake = {
	name: "",
	email: "",
	phone: "",
	location: "",
	projectType: "",
	timeline: "",
	details: "",
};

function hasValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasValidPhone(value: string) {
	return value.replace(/\D/g, "").length >= 10;
}

export function validateEstimateIntake(
	values: EstimateIntake,
): EstimateIntakeErrors {
	const errors: EstimateIntakeErrors = {};
	const name = values.name.trim();
	const email = values.email.trim();
	const phone = values.phone.trim();
	const location = values.location.trim();
	const details = values.details.trim();

	if (!name) errors.name = "Tell us who we should contact.";
	if (!values.projectType) errors.projectType = "Choose a project type.";
	if (!location) errors.location = "Add the city or project address.";
	if (details.length < 12) {
		errors.details =
			"Add a little more detail so a painter can review the scope.";
	}
	if (!email && !phone) {
		errors.contact = "Add an email address or phone number.";
	}
	if (email && !hasValidEmail(email)) {
		errors.email = "Enter a complete email address.";
	}
	if (phone && !hasValidPhone(phone)) {
		errors.phone = "Enter a phone number with at least 10 digits.";
	}

	return errors;
}

export function buildEstimateHandoff(values: EstimateIntake) {
	const subject = `Paint estimate request: ${values.projectType}`;
	const body = [
		"PAINT ESTIMATE REQUEST",
		"Status: Prepared by the customer; not yet sent or scheduled.",
		"",
		"CONTACT",
		`Name: ${values.name.trim()}`,
		`Email: ${values.email.trim() || "Not provided"}`,
		`Phone: ${values.phone.trim() || "Not provided"}`,
		`Project location: ${values.location.trim()}`,
		"",
		"PROJECT",
		`Type: ${values.projectType}`,
		`Timing: ${values.timeline.trim() || "Flexible / not provided"}`,
		"Details:",
		values.details.trim(),
		"",
		"The recipient must confirm receipt, scope, pricing, and availability.",
	].join("\n");

	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
