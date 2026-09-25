import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api.js";
import { OPERATIONS } from "./catalog";
import type { LeadStage } from "./lead";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const JOHNNY_SUBJECT = "https://clerk.test.local|lead_johnny";
const AGENT_SUBJECT = "https://clerk.test.local|lead_agent";
const CREW_SUBJECT = "https://clerk.test.local|lead_crew";
const TENANT_ID = "lead-test-tenant";

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function seedIdentity(
	t: ReturnType<typeof setup>,
	key: string,
	role: "principal" | "agent_owner" | "crew",
	subject: string,
) {
	const now = new Date().toISOString();
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			key,
			display_name: key,
			role,
			status: "active",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "test",
			schema_version: 1,
			company_id: "co_skys",
		});
		await ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier: subject,
			tenantId: TENANT_ID,
			enabled: true,
			role: "admin",
		});
	});
	await t.mutation(api.identity.bind, {
		user_key: key,
		provider: "clerk",
		provider_subject: subject,
	});
	return t.withIdentity({ tokenIdentifier: subject });
}

async function seedLead(t: ReturnType<typeof setup>, stage: LeadStage) {
	const key = `lead_seed_${stage.replaceAll(" ", "_")}`;
	const now = new Date().toISOString();
	await t.run(async (ctx) => {
		await ctx.db.insert("leads", {
			key,
			title: "Seed lead",
			stage,
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "other",
			schema_version: 1,
			company_id: "co_skys",
		});
	});
	return key;
}

function dispatchArgs(contract: string, payload: unknown, suffix: string) {
	return {
		contract,
		schema_version: 1,
		idempotency_key: `01KLEAD${suffix.padEnd(19, "0").slice(0, 19)}`,
		payload,
	};
}

async function assertBlockedEvent(t: ReturnType<typeof setup>, code: string) {
	const events = await t.run((ctx) => ctx.db.query("event_log").collect());
	expect(events.at(-1)?.action).toBe("catalog.blocked_attempt");
	expect(events.at(-1)?.reason).toContain(
		code.toLowerCase() === "validation" ? "validation" : code,
	);
}

describe("lead operation stage guards", () => {
	it("lead.capture is the sole create operation and has no stage guard", () => {
		expect(OPERATIONS["lead.capture"]?.guards).toEqual([]);
	});

	const guardedCases = [
		["lead.sendOutreach", { channel: "call" }],
		["lead.recordReply", { reply_summary: "reply" }],
		["lead.qualify", { client_name: "client-1" }],
		["lead.scheduleSiteVisit", { scheduled_at: "2099-01-01T00:00:00.000Z" }],
		["lead.startScope", { scope_notes: "scope" }],
		["lead.sendProposal", { amount_cents: 100000 }],
		["lead.submitBid", { bid_amount_cents: 100000 }],
		["lead.award", {}],
		["lead.win", {}],
		["lead.hold", { reason: "pause" }],
		["lead.resume", {}],
		["lead.disqualify", { reason: "fit" }],
		["lead.lose", { reason: "price" }],
		["lead.reopen", { reason: "new request" }],
	] as const;

	for (const [contract, extra] of guardedCases) {
		it(`${contract} returns GUARD_STAGE and writes a blocked event`, async () => {
			const t = setup();
			const authed = await seedIdentity(
				t,
				"usr_johnny",
				"principal",
				JOHNNY_SUBJECT,
			);
			const leadId = await seedLead(t, "Won");
			const response = await authed.mutation(
				api.catalog.dispatch,
				dispatchArgs(contract, { lead_id: leadId, ...extra }, contract),
			);
			expect(response.error?.code).toBe("GUARD_STAGE");
			await assertBlockedEvent(t, "GUARD_STAGE");
		});
	}
});

describe("lead validation and authority", () => {
	for (const contract of ["lead.disqualify", "lead.lose"]) {
		it(`${contract} requires a reason`, async () => {
			const t = setup();
			const authed = await seedIdentity(
				t,
				"usr_johnny",
				"principal",
				JOHNNY_SUBJECT,
			);
			const leadId = await seedLead(t, "Outreach Sent");
			const response = await authed.mutation(
				api.catalog.dispatch,
				dispatchArgs(contract, { lead_id: leadId }, `${contract}-reason`),
			);
			expect(response.error?.code).toBe("VALIDATION");
			await assertBlockedEvent(t, "VALIDATION");
		});
	}

	it("Crew is forbidden from lead.award", async () => {
		const t = setup();
		const authed = await seedIdentity(t, "usr_crew", "crew", CREW_SUBJECT);
		const leadId = await seedLead(t, "Bid Submitted");
		const response = await authed.mutation(
			api.catalog.dispatch,
			dispatchArgs("lead.award", { lead_id: leadId }, "crew-award"),
		);
		expect(response.error?.code).toBe("FORBIDDEN");
	});

	it("Agent is forbidden from lead.win", async () => {
		const t = setup();
		const authed = await seedIdentity(
			t,
			"agt_test",
			"agent_owner",
			AGENT_SUBJECT,
		);
		const leadId = await seedLead(t, "Awarded");
		const response = await authed.mutation(
			api.catalog.dispatch,
			dispatchArgs("lead.win", { lead_id: leadId }, "agent-win"),
		);
		expect(response.error?.code).toBe("FORBIDDEN");
	});
});

describe("lead catalog framework acceptance", () => {
	it("AT-03 resolves the actor server-side on lead.capture", async () => {
		const t = setup();
		const authed = await seedIdentity(
			t,
			"usr_johnny",
			"principal",
			JOHNNY_SUBJECT,
		);
		const response = await authed.mutation(
			api.catalog.dispatch,
			dispatchArgs(
				"lead.capture",
				{ title: "Server actor", source: "phone", created_by: "forged" },
				"lead-at03",
			),
		);
		expect(response.ok).toBe(true);
		const event = await t.run((ctx) =>
			ctx.db
				.query("event_log")
				.filter((q) => q.eq(q.field("action"), "lead.captured"))
				.unique(),
		);
		expect(event?.actor_user_id).toBe("usr_johnny");
	});

	it("replays lead.capture without duplicating its lead or event", async () => {
		const t = setup();
		const authed = await seedIdentity(
			t,
			"usr_johnny",
			"principal",
			JOHNNY_SUBJECT,
		);
		const args = dispatchArgs(
			"lead.capture",
			{ title: "Idempotent lead", source: "portal" },
			"lead-idempotency",
		);
		const first = await authed.mutation(api.catalog.dispatch, args);
		const replay = await authed.mutation(api.catalog.dispatch, args);
		expect(replay).toEqual(first);
		const counts = await t.run(async (ctx) => ({
			leads: (await ctx.db.query("leads").collect()).length,
			events: (
				await ctx.db
					.query("event_log")
					.filter((q) => q.eq(q.field("action"), "lead.captured"))
					.collect()
			).length,
		}));
		expect(counts).toEqual({ leads: 1, events: 1 });
	});
});

describe("lead pipeline", () => {
	it("walks Prospect to Won through dispatch and delegates component workflows", async () => {
		const t = setup();
		const authed = await seedIdentity(
			t,
			"usr_johnny",
			"principal",
			JOHNNY_SUBJECT,
		);
		await t.mutation(components.contractorOs.records.co_client.create, {
			tenantId: TENANT_ID,
			actorId: "seed",
			requestKey: "seed-client",
			identifier: "client-1",
			title: "Client One",
			properties: { status: "prospect" },
		});
		let request = 0;
		const dispatch = (contract: string, payload: unknown) =>
			authed.mutation(
				api.catalog.dispatch,
				dispatchArgs(
					contract,
					payload,
					`${String(++request).padStart(2, "0")}-walk`,
				),
			);
		const captured = await dispatch("lead.capture", {
			title: "Exterior repaint",
			source: "referral",
		});
		const leadId = captured.record_id as string;
		await dispatch("lead.sendOutreach", { lead_id: leadId, channel: "call" });
		await dispatch("lead.recordReply", {
			lead_id: leadId,
			reply_summary: "Interested",
		});
		const qualified = await dispatch("lead.qualify", {
			lead_id: leadId,
			client_name: "client-1",
			qualification_notes: "Qualified",
		});
		expect(qualified, JSON.stringify(qualified)).toMatchObject({ ok: true });
		const coLeadId = qualified.entity_refs[1];
		expect(coLeadId).toBeTruthy();
		const componentLeads = await authed.query(api.backend.listLeads, {
			paginationOpts: { cursor: null, numItems: 100 },
		});
		expect(componentLeads.page).toContainEqual(
			expect.objectContaining({ identifier: coLeadId, state: "qualifying" }),
		);
		const afterQualifyEvents = await t.run((ctx) =>
			ctx.db.query("event_log").collect(),
		);
		expect(
			afterQualifyEvents.filter((event) =>
				event.reason?.includes("INITIAL_STATE_REQUIRED"),
			),
		).toHaveLength(0);
		const visit = await dispatch("lead.scheduleSiteVisit", {
			lead_id: leadId,
			scheduled_at: "2099-01-01T00:00:00.000Z",
		});
		expect(visit.entity_refs.some((ref) => ref.startsWith("visit-"))).toBe(
			true,
		);
		const scope = await dispatch("lead.startScope", {
			lead_id: leadId,
			scope_notes: "Prep and two coats",
		});
		expect(scope.entity_refs).toContain(`scope-${coLeadId}-v1`);
		const proposal = await dispatch("lead.sendProposal", {
			lead_id: leadId,
			amount_cents: 100000,
		});
		expect(proposal.entity_refs).toContain(`proposal-${coLeadId}-v1`);
		const bid = await dispatch("lead.submitBid", {
			lead_id: leadId,
			bid_amount_cents: 100000,
		});
		expect(bid.entity_refs).toContain(`bid-${leadId}`);
		await dispatch("lead.award", { lead_id: leadId });
		const won = await dispatch("lead.win", { lead_id: leadId });
		expect(won.ok).toBe(true);
		expect(won.status).toBe("Won");
		expect(won.entity_refs.some((ref) => ref.startsWith("contract-"))).toBe(
			true,
		);
		const paintingLead = await t.run((ctx) =>
			ctx.db
				.query("leads")
				.withIndex("by_key", (q) => q.eq("key", leadId))
				.unique(),
		);
		expect(paintingLead?.stage).toBe("Won");
	});

	for (const terminal of ["Lost", "Disqualified"] as const) {
		it(`reopens ${terminal} into a new Prospect without mutating its source`, async () => {
			const t = setup();
			const authed = await seedIdentity(
				t,
				"usr_johnny",
				"principal",
				JOHNNY_SUBJECT,
			);
			const sourceId = await seedLead(t, terminal);
			const response = await authed.mutation(
				api.catalog.dispatch,
				dispatchArgs(
					"lead.reopen",
					{ lead_id: sourceId, reason: "Re-engaged" },
					`reopen-${terminal}`,
				),
			);
			expect(response.ok).toBe(true);
			const records = await t.run((ctx) => ctx.db.query("leads").collect());
			expect(records.find((record) => record.key === sourceId)?.stage).toBe(
				terminal,
			);
			expect(
				records.find((record) => record.key === response.record_id),
			).toMatchObject({ stage: "Prospect", reopened_from: sourceId });
		});
	}

	it("rejects reopening Won", async () => {
		const t = setup();
		const authed = await seedIdentity(
			t,
			"usr_johnny",
			"principal",
			JOHNNY_SUBJECT,
		);
		const leadId = await seedLead(t, "Won");
		const response = await authed.mutation(
			api.catalog.dispatch,
			dispatchArgs(
				"lead.reopen",
				{ lead_id: leadId, reason: "Invalid" },
				"won-reopen",
			),
		);
		expect(response.error?.code).toBe("GUARD_STAGE");
	});
});
