import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const paginationOpts = { cursor: null, numItems: 100 };
const tenantId = "tenant-test";
const tokenIdentifier = "https://issuer.example|user-test";

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function enableAdmin(t: ReturnType<typeof setup>) {
	await t.run(async (ctx) => {
		await ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier,
			tenantId,
			enabled: true,
			role: "admin",
		});
	});
	return t.withIdentity({ tokenIdentifier });
}

async function seedRecord(
	t: ReturnType<typeof setup>,
	record: "co_client" | "co_subcontractor",
	identifier: string,
	properties: Record<string, unknown>,
) {
	return t.mutation(components.contractorOs.records[record].create, {
		tenantId,
		actorId: "test-seed",
		requestKey: `seed-${record}`,
		identifier,
		title: identifier,
		properties,
	});
}

describe("backend facade", () => {
	it("round-trips a lead through lists, history, and projections", async () => {
		const t = setup();
		await seedRecord(t, "co_client", "client-1", { status: "prospect" });
		const authed = await enableAdmin(t);

		const created = await authed.mutation(api.backend.co_create_lead, {
			requestKey: "create-lead-roundtrip",
			input: { title: "Kitchen remodel", client: "client-1" },
		});

		const leads = await authed.query(api.backend.listLeads, { paginationOpts });
		expect(leads.page).toContainEqual(
			expect.objectContaining({
				identifier: created.primary.identifier,
				title: "Kitchen remodel",
				state: "new",
				revision: 1,
			}),
		);

		const history = await authed.query(api.backend.history, { paginationOpts });
		expect(history.page).toContainEqual(
			expect.objectContaining({
				actorId: tokenIdentifier,
				requestKey: "create-lead-roundtrip",
				type: "record.created",
				command: "co_create_lead",
			}),
		);

		const projection = await authed.query(api.backend.inspectRecord, {
			blueprint: "co_lead",
			identifier: created.primary.identifier,
		});
		expect(projection).toEqual(
			expect.objectContaining({
				blueprint: "co_lead",
				identifier: created.primary.identifier,
				title: "Kitchen remodel",
				revision: 1,
			}),
		);
	});

	it("rejects an unauthenticated execute call", async () => {
		const t = setup();
		await expect(
			t.mutation(api.backend.execute, {
				requestKey: "unauthenticated",
				command: {
					kind: "co_create_lead",
					input: { title: "Denied", client: "client-1" },
				},
			}),
		).rejects.toThrow("UNAUTHENTICATED");
	});

	it("executes every business command kind through the authenticated facade", async () => {
		const t = setup();
		await seedRecord(t, "co_client", "client-1", { status: "prospect" });
		await seedRecord(t, "co_subcontractor", "sub-1", {
			status: "prospect",
			w9_on_file: true,
			insurance_expiry: "2099-01-01T00:00:00.000Z",
			license_expiry: "2099-01-01T00:00:00.000Z",
		});
		const authed = await enableAdmin(t);
		let request = 0;
		const execute = (
			command: { kind: string; input: Record<string, unknown> },
			options = {},
		) =>
			authed.mutation(api.backend.execute, {
				requestKey: `command-${++request}`,
				// Test helper constructs valid commands; bypass strict union type for the helper signature
				command: command as unknown as Parameters<
					typeof api.backend.execute
				>[0]["command"],
				...options,
			});
		const expected = (
			blueprint: string,
			identifier: string,
			revision: number,
		) => ({
			blueprint,
			identifier,
			revision,
		});
		const evidence = (kind: string) => ({
			kind,
			reference: `${kind}-${request + 1}`,
			occurredAt: "2026-01-01T00:00:00.000Z",
		});
		await execute(
			{
				kind: "transition",
				input: {
					blueprint: "co_subcontractor",
					identifier: "sub-1",
					to: "prequalified",
				},
			},
			{ expected: [expected("co_subcontractor", "sub-1", 1)] },
		);

		const lead = await execute({
			kind: "co_create_lead",
			input: { title: "Facade smoke lead", client: "client-1" },
		});
		const leadId = lead.primary.identifier;
		await execute(
			{
				kind: "co_advance_lead",
				input: { lead: leadId, new_stage: "qualifying" },
			},
			{ expected: [expected("co_lead", leadId, 1)] },
		);
		await execute(
			{
				kind: "co_schedule_site_visit",
				input: { lead: leadId, visit_date: "2099-01-01T00:00:00.000Z" },
			},
			{ expected: [expected("co_lead", leadId, 2)] },
		);
		const scope = await execute(
			{
				kind: "co_create_scope",
				input: {
					lead: leadId,
					version: "1",
					description: "Complete smoke scope",
				},
			},
			{ expected: [expected("co_lead", leadId, 3)] },
		);
		const scopeId = scope.primary.identifier;
		await execute(
			{
				kind: "transition",
				input: { blueprint: "co_scope", identifier: scopeId, to: "in_review" },
			},
			{ expected: [expected("co_scope", scopeId, 1)] },
		);
		await execute(
			{
				kind: "transition",
				input: { blueprint: "co_scope", identifier: scopeId, to: "approved" },
			},
			{
				expected: [expected("co_scope", scopeId, 2)],
				evidence: evidence("scope_approved"),
			},
		);
		const proposal = await execute({
			kind: "co_create_proposal",
			input: {
				lead: leadId,
				scope: scopeId,
				client: "client-1",
				amount: 1000,
				version: "1",
			},
		});
		const proposalId = proposal.primary.identifier;
		await execute(
			{
				kind: "transition",
				input: {
					blueprint: "co_proposal",
					identifier: proposalId,
					to: "in_review",
				},
			},
			{ expected: [expected("co_proposal", proposalId, 1)] },
		);
		await execute(
			{
				kind: "transition",
				input: { blueprint: "co_proposal", identifier: proposalId, to: "sent" },
			},
			{
				expected: [
					expected("co_proposal", proposalId, 2),
					expected("co_lead", leadId, 4),
				],
				evidence: evidence("proposal_sent"),
			},
		);
		const bid = await execute(
			{
				kind: "co_submit_bid",
				input: {
					lead: leadId,
					proposal: proposalId,
					client: "client-1",
					amount: 1000,
					bid_type: "invited",
				},
			},
			{
				expected: [expected("co_lead", leadId, 5)],
				evidence: evidence("bid_submitted"),
			},
		);
		const bidId = bid.primary.identifier;
		const contract = await execute(
			{
				kind: "co_convert_bid_to_contract",
				input: {
					bid: bidId,
					client: "client-1",
					contract_type: "lump_sum",
					retainage_percent: 0,
				},
			},
			{
				expected: [
					expected("co_bid", bidId, 1),
					expected("co_lead", leadId, 6),
				],
				evidence: evidence("bid_awarded"),
			},
		);
		const contractId = contract.primary.identifier;
		await execute(
			{
				kind: "co_mark_contract_signed",
				input: {
					contract: contractId,
					contract_doc_url: "https://example.test/contract.pdf",
				},
			},
			{
				expected: [expected("co_contract", contractId, 1)],
				evidence: evidence("contract_signed"),
			},
		);
		const job = await execute(
			{
				kind: "co_create_job",
				input: {
					contract: contractId,
					client: "client-1",
					job_type: "commercial",
					job_number: "1001",
				},
			},
			{ expected: [expected("co_lead", leadId, 7)] },
		);
		const jobId = job.primary.identifier;
		await execute(
			{
				kind: "assign_subcontractor",
				input: { job: jobId, subcontractor: "sub-1" },
			},
			{
				expected: [
					expected("co_job", jobId, 1),
					expected("co_subcontractor", "sub-1", 2),
				],
			},
		);
		await execute(
			{
				kind: "transition",
				input: { blueprint: "co_job", identifier: jobId, to: "mobilizing" },
			},
			{ expected: [expected("co_job", jobId, 2)] },
		);
		await execute({
			kind: "submit_daily_report",
			input: {
				job: jobId,
				report_date: "2026-01-01T00:00:00.000Z",
				work_performed: "Smoke work",
				crew_size: 2,
			},
		});
		const invoice = await execute({
			kind: "co_create_invoice",
			input: {
				job: jobId,
				client: "client-1",
				amount: 1000,
				due_date: "2099-02-01T00:00:00.000Z",
				invoice_type: "final",
				invoice_number: "1001",
			},
		});
		const invoiceId = invoice.primary.identifier;
		await execute(
			{
				kind: "transition",
				input: { blueprint: "co_invoice", identifier: invoiceId, to: "sent" },
			},
			{
				expected: [
					expected("co_invoice", invoiceId, 1),
					expected("co_job", jobId, 3),
				],
				evidence: evidence("invoice_issued"),
			},
		);
		const payment = await execute(
			{
				kind: "co_record_payment",
				input: {
					invoice: invoiceId,
					client: "client-1",
					amount: 1000,
					payment_date: "2026-01-01T00:00:00.000Z",
					payment_method: "ach",
				},
			},
			{
				expected: [
					expected("co_invoice", invoiceId, 2),
					expected("co_job", jobId, 4),
				],
				evidence: evidence("payment_received"),
			},
		);

		expect(payment.primary.blueprint).toBe("co_payment");
		expect(request).toBe(20);
	});
});
