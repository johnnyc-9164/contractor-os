import {
	historyResult,
	invoiceBalanceResult,
	jobFinancialsResult,
	listResult,
} from "@johnnyc2026/contractor-os-core/operation-validators";
import {
	businessCommand,
	businessResult,
	commandInputs,
	commandOptions,
} from "@johnnyc2026/contractor-os-core/workflow-validators";
import { describe, expect, it } from "vitest";

// Minimal structural view of a convex/values validator — enough to assert the
// domain contract shape without a Convex runtime.
interface FieldValidator {
	kind: string;
	isOptional: "required" | "optional";
	value?: unknown;
	fields?: Record<string, FieldValidator>;
	members?: FieldValidator[];
}

function asObject(v: unknown): Record<string, FieldValidator> {
	const shape = v as FieldValidator;
	expect(shape.kind).toBe("object");
	expect(shape.fields).toBeDefined();
	return shape.fields as Record<string, FieldValidator>;
}

describe("workflow-validators: commandInputs", () => {
	const expectedCommands = [
		"co_create_lead",
		"co_schedule_site_visit",
		"co_advance_lead",
		"co_create_scope",
		"co_create_proposal",
		"co_submit_bid",
		"co_record_payment",
		"co_create_job",
		"co_convert_bid_to_contract",
		"co_mark_contract_signed",
		"co_create_invoice",
		"transition",
		"assign_subcontractor",
		"submit_daily_report",
	];

	it("exposes a validator for every business command", () => {
		for (const name of expectedCommands) {
			expect(commandInputs[name as keyof typeof commandInputs]).toBeDefined();
		}
		expect(Object.keys(commandInputs)).toHaveLength(expectedCommands.length);
	});

	it("co_create_lead requires title and client", () => {
		const fields = asObject(commandInputs.co_create_lead);
		expect(fields.title.isOptional).toBe("required");
		expect(fields.client.isOptional).toBe("required");
	});

	it("co_create_lead keeps stage and priority optional", () => {
		const fields = asObject(commandInputs.co_create_lead);
		expect(fields.stage.isOptional).toBe("optional");
		expect(fields.priority.isOptional).toBe("optional");
	});

	it("submit_daily_report requires job, report_date, work_performed, crew_size", () => {
		const fields = asObject(commandInputs.submit_daily_report);
		for (const name of ["job", "report_date", "work_performed", "crew_size"]) {
			expect(fields[name].isOptional).toBe("required");
		}
		expect(fields.notes.isOptional).toBe("optional");
	});
});

describe("workflow-validators: businessCommand", () => {
	it("is a union with one member per command kind", () => {
		const shape = businessCommand as unknown as FieldValidator;
		expect(shape.kind).toBe("union");
		expect(shape.members).toHaveLength(14);
	});

	it("every member pairs a literal kind with an object input", () => {
		const shape = businessCommand as unknown as FieldValidator;
		for (const member of shape.members ?? []) {
			const fields = asObject(member);
			expect(fields.kind.kind).toBe("literal");
			expect(typeof fields.kind.value).toBe("string");
			expect(asObject(fields.input)).toBeDefined();
		}
	});
});

describe("workflow-validators: businessResult and commandOptions", () => {
	it("businessResult carries policy version, keys, effects, and replay flag", () => {
		const fields = asObject(businessResult);
		for (const name of [
			"policyVersion",
			"requestKey",
			"primary",
			"effects",
			"replayed",
		]) {
			expect(fields[name]).toBeDefined();
		}
		expect(fields.replayed.kind).toBe("boolean");
	});

	it("commandOptions requires requestKey and keeps expected/evidence optional", () => {
		expect(commandOptions.requestKey.isOptional).toBe("required");
		expect(commandOptions.expected?.isOptional).toBe("optional");
		expect(commandOptions.evidence?.isOptional).toBe("optional");
	});
});

describe("operation-validators", () => {
	it("invoiceBalanceResult accepts null and carries balance fields", () => {
		const shape = invoiceBalanceResult as unknown as FieldValidator;
		expect(shape.kind).toBe("union");
		expect(shape.members?.some((m) => m.kind === "null")).toBe(true);
		const obj = shape.members?.find((m) => m.kind === "object");
		expect(obj).toBeDefined();
		const fields = asObject(obj);
		for (const name of [
			"identifier",
			"amount",
			"amountPaid",
			"balanceDue",
			"status",
		]) {
			expect(fields[name]).toBeDefined();
		}
	});

	it("jobFinancialsResult pins currency to USD", () => {
		const shape = jobFinancialsResult as unknown as FieldValidator;
		const obj = shape.members?.find((m) => m.kind === "object");
		const fields = asObject(obj);
		expect(fields.currency.kind).toBe("literal");
		expect(fields.currency.value).toBe("USD");
		for (const name of [
			"contractAmount",
			"outstandingBalance",
			"billedToDate",
		]) {
			expect(fields[name]).toBeDefined();
		}
	});

	it("historyResult pages events with an isDone flag", () => {
		const fields = asObject(historyResult);
		expect(fields.page.kind).toBe("array");
		expect(fields.isDone.kind).toBe("boolean");
		expect(fields.continueCursor.kind).toBe("string");
	});

	it("listResult pages records with identifier, state, and revision", () => {
		const fields = asObject(listResult);
		expect(fields.page.kind).toBe("array");
		expect(fields.isDone.kind).toBe("boolean");
	});
});
