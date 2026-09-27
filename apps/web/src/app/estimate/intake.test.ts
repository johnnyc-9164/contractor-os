import { describe, expect, it } from "vitest";
import {
	buildEstimateHandoff,
	type EstimateIntake,
	validateEstimateIntake,
} from "./intake";

const validIntake: EstimateIntake = {
	name: "Jordan Lee",
	email: "jordan@example.com",
	phone: "",
	location: "St. Paul, MN",
	projectType: "Interior painting",
	timeline: "Within a month",
	details: "Living room, hall, and two bedrooms need walls and trim painted.",
};

describe("validateEstimateIntake", () => {
	it("accepts a contactable project brief", () => {
		expect(validateEstimateIntake(validIntake)).toEqual({});
	});

	it("requires project context and at least one contact channel", () => {
		const errors = validateEstimateIntake({
			...validIntake,
			name: " ",
			email: "",
			location: "",
			projectType: "",
			details: "paint",
		});

		expect(errors).toMatchObject({
			name: expect.any(String),
			contact: expect.any(String),
			location: expect.any(String),
			projectType: expect.any(String),
			details: expect.any(String),
		});
	});

	it("rejects malformed contact values when supplied", () => {
		expect(
			validateEstimateIntake({
				...validIntake,
				email: "not-an-email",
				phone: "555-12",
			}),
		).toMatchObject({
			email: expect.any(String),
			phone: expect.any(String),
		});
	});
});

describe("buildEstimateHandoff", () => {
	it("builds an address-free email draft that says the request is not sent", () => {
		const href = buildEstimateHandoff(validIntake);
		const decoded = decodeURIComponent(href);

		expect(href).toMatch(/^mailto:\?subject=/);
		expect(decoded).toContain("not yet sent or scheduled");
		expect(decoded).toContain("Jordan Lee");
		expect(decoded).toContain("Interior painting");
		expect(decoded).toContain("The recipient must confirm");
	});
});
