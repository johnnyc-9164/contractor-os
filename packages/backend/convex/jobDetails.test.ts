import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import type { FunctionArgs } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function member(
	t: ReturnType<typeof setup>,
	subject: string,
	tenantId: string,
	enabled = true,
	role: "viewer" | "admin" = "viewer",
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier: subject,
			tenantId,
			enabled,
			role,
		});
	});
	return t.withIdentity({ tokenIdentifier: subject });
}

async function seedSignedJob(t: ReturnType<typeof setup>) {
	await t.mutation(components.contractorOs.records.co_client.create, {
		tenantId: "tenant-a",
		actorId: "seed",
		identifier: "client-1",
		requestKey: "seed-client",
		title: "Client",
		properties: { status: "prospect" },
	});
	const admin = await member(t, "issuer|admin", "tenant-a", true, "admin");
	let request = 0;
	const execute = (
		command: FunctionArgs<typeof api.backend.execute>["command"],
		options: Omit<
			FunctionArgs<typeof api.backend.execute>,
			"command" | "requestKey"
		> = {},
	) =>
		admin.mutation(api.backend.execute, {
			requestKey: `job-seed-${++request}`,
			command,
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
		reference: `job-seed-evidence-${request + 1}`,
		occurredAt: "2026-01-01T00:00:00.000Z",
	});
	const lead = await execute({
		kind: "co_create_lead",
		input: { title: "Johnson residence", client: "client-1" },
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
			input: { lead: leadId, version: "1", description: "Exterior painting" },
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
			amount: 1200,
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
				amount: 1200,
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
			expected: [expected("co_bid", bidId, 1), expected("co_lead", leadId, 6)],
			evidence: evidence("bid_awarded"),
		},
	);
	const contractId = contract.primary.identifier;
	await execute(
		{
			kind: "co_mark_contract_signed",
			input: {
				contract: contractId,
				contract_doc_url: "https://example.test/signed.pdf",
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
				job_type: "residential",
				job_number: "1042",
			},
		},
		{ expected: [expected("co_lead", leadId, 7)] },
	);
	return { admin, identifier: job.primary.identifier };
}

describe("job detail authorization", () => {
	it("returns persisted fields to the owner and no foreign or missing record", async () => {
		const t = setup();
		const { admin: own, identifier } = await seedSignedJob(t);
		const foreign = await member(t, "issuer|b", "tenant-b");
		expect(await own.query(api.jobDetails.get, { identifier })).toEqual(
			expect.objectContaining({
				identifier,
				status: "pre_construction",
				jobType: "residential",
			}),
		);
		expect(await foreign.query(api.jobDetails.get, { identifier })).toBeNull();
		expect(
			await own.query(api.jobDetails.get, { identifier: "unknown" }),
		).toBeNull();
	});

	it("rejects anonymous and disabled callers before reading a job", async () => {
		const t = setup();
		await expect(
			t.query(api.jobDetails.get, { identifier: "job-1042" }),
		).rejects.toThrow("UNAUTHENTICATED");
		const disabled = await member(t, "issuer|disabled", "tenant-a", false);
		await expect(
			disabled.query(api.jobDetails.get, { identifier: "job-1042" }),
		).rejects.toThrow("FORBIDDEN");
	});
});
