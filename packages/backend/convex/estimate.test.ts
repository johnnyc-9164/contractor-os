import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api.js";
import { OPERATIONS } from "./catalog";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const JOHNNY = "https://clerk.test.local|estimate_johnny";
const ANTHONY = "https://clerk.test.local|estimate_anthony";
const AGENT = "https://clerk.test.local|estimate_agent";

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function seed(t: ReturnType<typeof setup>) {
	const now = new Date().toISOString();
	await t.run(async (ctx) => {
		for (const [key, role, subject] of [
			["usr_johnny", "principal", JOHNNY],
			["usr_anthony", "viewer", ANTHONY],
			["agt_estimator", "agent_owner", AGENT],
		] as const) {
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
				tenantId: "estimate-test",
				enabled: true,
				role: "admin",
			});
		}
		await ctx.db.insert("leads", {
			key: "lead_estimate",
			title: "Estimate lead",
			stage: "Scope In Progress",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "other",
			schema_version: 1,
			company_id: "co_skys",
		});
		for (const [set, status] of [
			["rs_approved", "approved"],
			["rs_draft", "draft"],
		] as const) {
			await ctx.db.insert("rate_sets", {
				key: set,
				name: set,
				version: 1,
				status,
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
		}
		for (const [key, code, rate] of [
			["rr_prep", "prep", 1000],
			["rr_setup", "setup", 1000],
			["rr_cleanup", "cleanup", 1000],
			["rr_labor", "labor", 5000],
		] as const) {
			await ctx.db.insert("rate_rows", {
				key,
				rate_set_id: "rs_approved",
				cost_code: code,
				description: code,
				rate_cents: rate,
				unit: "hour",
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
		}
	});
	await t.mutation(api.identity.bind, {
		user_key: "usr_johnny",
		provider: "clerk",
		provider_subject: JOHNNY,
	});
	const johnny = t.withIdentity({ tokenIdentifier: JOHNNY });
	for (const [user_key, provider_subject] of [
		["usr_anthony", ANTHONY],
		["agt_estimator", AGENT],
	]) {
		await johnny.mutation(api.identity.bind, {
			user_key,
			provider: "clerk",
			provider_subject,
		});
	}
	return {
		johnny,
		anthony: t.withIdentity({ tokenIdentifier: ANTHONY }),
		agent: t.withIdentity({ tokenIdentifier: AGENT }),
	};
}

let sequence = 0;
function dispatch(
	caller: Awaited<ReturnType<typeof seed>>["johnny"],
	contract: string,
	payload: unknown,
) {
	sequence += 1;
	return caller.mutation(api.catalog.dispatch, {
		contract,
		schema_version: 1,
		idempotency_key: `estimate-${sequence}`,
		payload,
	});
}

const lines = [
	{
		rate_row_ref: "rr_prep",
		kind: "prep",
		label: "Prep",
		quantity: 1,
		unit: "hour",
		epistemic: "measured",
	},
	{
		rate_row_ref: "rr_setup",
		kind: "setup",
		label: "Setup",
		quantity: 1,
		unit: "hour",
		epistemic: "measured",
	},
	{
		rate_row_ref: "rr_cleanup",
		kind: "cleanup",
		label: "Cleanup",
		quantity: 1,
		unit: "hour",
		epistemic: "measured",
	},
	{
		rate_row_ref: "rr_labor",
		kind: "labor",
		label: "Labor",
		quantity: 10,
		unit: "hour",
		burdened_pct: 20,
		epistemic: "measured",
	},
];

async function createEstimate(
	caller: Awaited<ReturnType<typeof seed>>["johnny"],
	assumptions: unknown[] = [],
) {
	return dispatch(caller, "estimate.create", {
		lead_id: "lead_estimate",
		rate_set_version: "rs_approved",
		lines,
		assumptions,
	});
}

describe("estimate catalog family", () => {
	it("registers the six named operations", () => {
		expect(
			Object.keys(OPERATIONS).filter(
				(name) => name.startsWith("estimate.") || name.startsWith("approval."),
			),
		).toEqual([
			"estimate.create",
			"estimate.reprice",
			"estimate.submitForReview",
			"approval.technical",
			"approval.commercial",
			"estimate.abandon",
		]);
		expect(OPERATIONS["approval.technical"]?.authority).toEqual(["Anthony"]);
	});

	it("walks create, ownership gate, approvals, commercial, reprice, supersede, and abandon", async () => {
		const t = setup();
		const actors = await seed(t);
		const created = await createEstimate(actors.johnny, [
			{ text: "Access is clear" },
		]);
		expect(created).toMatchObject({ ok: true, status: "draft" });
		const estimateId = created.record_id as string;
		const stored = await t.run(async (ctx) => ({
			estimate: await ctx.db
				.query("estimates")
				.withIndex("by_key", (q) => q.eq("key", estimateId))
				.unique(),
			lines: await ctx.db
				.query("estimate_lines")
				.filter((q) => q.eq(q.field("estimate_id"), estimateId))
				.collect(),
			assumptions: await ctx.db
				.query("assumptions")
				.filter((q) => q.eq(q.field("owner_entity"), estimateId))
				.collect(),
		}));
		expect(stored.estimate).toMatchObject({
			version: 1,
			status: "draft",
			source_ref: "rs_approved",
			formula_set_version: "estimate-formula-v1",
		});
		expect(
			stored.lines.every(
				(line) => line.extended_cost_cents > 0 && line.formula_ref,
			),
		).toBe(true);
		expect(stored.assumptions[0]?.status).toBe("open");
		expect(stored.assumptions[0]?.owner_user_id).toBeUndefined();

		const blocked = await dispatch(actors.johnny, "estimate.submitForReview", {
			estimate_id: estimateId,
		});
		expect(blocked.error?.code).toBe("GUARD_BLOCKED");
		expect(JSON.stringify(blocked.error?.detail)).toContain("missing owners");
		const assumptionKey = stored.assumptions[0]?.key;
		if (!assumptionKey) throw new Error("missing assumption");
		const claimed = await dispatch(actors.johnny, "assumption.claim", {
			assumption_id: assumptionKey,
			owner_user_id: "usr_johnny",
		});
		expect(claimed).toMatchObject({ ok: true, status: "owned" });
		const claimedRow = await t.run((ctx) =>
			ctx.db
				.query("assumptions")
				.withIndex("by_key", (q) => q.eq("key", assumptionKey))
				.unique(),
		);
		expect(claimedRow).toMatchObject({
			owner_user_id: "usr_johnny",
			status: "owned",
		});
		expect(
			(await t.run((ctx) => ctx.db.query("event_log").collect())).some(
				(event) =>
					event.action === "assumption.claimed" &&
					event.entity_id === assumptionKey,
			),
		).toBe(true);
		const doubleClaim = await dispatch(actors.johnny, "assumption.claim", {
			assumption_id: assumptionKey,
			owner_user_id: "usr_johnny",
		});
		expect(doubleClaim.error?.code).toBe("GUARD_BLOCKED");
		expect(
			await dispatch(actors.johnny, "estimate.submitForReview", {
				estimate_id: estimateId,
			}),
		).toMatchObject({ ok: true, status: "anthony_review" });
		const approved = await dispatch(actors.anthony, "approval.technical", {
			estimate_id: estimateId,
			decision: "approve",
		});
		expect(approved).toMatchObject({ ok: true, status: "approved" });
		expect(approved.facts.artifact_hash).toMatch(/^[a-f0-9]{64}$/);
		const commercial = await dispatch(actors.johnny, "approval.commercial", {
			estimate_id: estimateId,
		});
		expect(commercial.ok).toBe(true);
		expect(commercial.facts.warnings).toContain("margin below 10 percent");

		const before = await t.run((ctx) =>
			ctx.db
				.query("estimates")
				.withIndex("by_key", (q) => q.eq("key", estimateId))
				.unique(),
		);
		const repriced = await dispatch(actors.johnny, "estimate.reprice", {
			estimate_id: estimateId,
			reason: "Updated takeoff",
		});
		expect(repriced).toMatchObject({ ok: true, status: "draft" });
		const v2 = repriced.record_id as string;
		const after = await t.run((ctx) =>
			ctx.db
				.query("estimates")
				.withIndex("by_key", (q) => q.eq("key", estimateId))
				.unique(),
		);
		expect(after).toEqual(before);
		await dispatch(actors.johnny, "estimate.submitForReview", {
			estimate_id: v2,
		});
		await dispatch(actors.anthony, "approval.technical", {
			estimate_id: v2,
			decision: "approve",
		});
		const versions = await t.run(async (ctx) => ({
			v1: await ctx.db
				.query("estimates")
				.withIndex("by_key", (q) => q.eq("key", estimateId))
				.unique(),
			v2: await ctx.db
				.query("estimates")
				.withIndex("by_key", (q) => q.eq("key", v2))
				.unique(),
		}));
		expect(versions.v1?.status).toBe("superseded");
		expect(versions.v2).toMatchObject({
			version: 2,
			supersedes_version_id: estimateId,
			status: "approved",
		});

		const draft = await createEstimate(actors.johnny);
		expect(
			await dispatch(actors.johnny, "estimate.abandon", {
				estimate_id: draft.record_id,
				reason: "Duplicate",
			}),
		).toMatchObject({ ok: true, status: "abandoned" });
		expect(
			(
				await dispatch(actors.johnny, "estimate.abandon", {
					estimate_id: draft.record_id,
				})
			).error?.code,
		).toBe("VALIDATION");
	});

	it("returns required validation, rate, burden, authority, and reject results with events", async () => {
		const t = setup();
		const actors = await seed(t);
		const badRate = await dispatch(actors.johnny, "estimate.create", {
			lead_id: "lead_estimate",
			rate_set_version: "rs_draft",
			lines,
			assumptions: [],
		});
		expect(badRate.error?.code).toBe("GUARD_BLOCKED");
		expect(
			await t.run((ctx) => ctx.db.query("estimates").collect()),
		).toHaveLength(0);
		const money = await dispatch(actors.agent, "estimate.create", {
			lead_id: "lead_estimate",
			rate_set_version: "rs_approved",
			base_total_cents: 1,
			lines: [{ ...lines[0], extended_cost_cents: 1 }],
			assumptions: [],
		});
		expect(money.error?.code).toBe("VALIDATION");

		const noBurden = await dispatch(actors.johnny, "estimate.create", {
			lead_id: "lead_estimate",
			rate_set_version: "rs_approved",
			lines: lines.map((line) =>
				line.kind === "labor" ? { ...line, burdened_pct: 0 } : line,
			),
			assumptions: [],
		});
		const burdenBlocked = await dispatch(
			actors.johnny,
			"estimate.submitForReview",
			{ estimate_id: noBurden.record_id },
		);
		expect(String(burdenBlocked.error?.detail)).toContain("burdened labor");

		const review = await createEstimate(actors.johnny);
		await dispatch(actors.johnny, "estimate.submitForReview", {
			estimate_id: review.record_id,
		});
		const forbidden = await dispatch(actors.agent, "approval.technical", {
			estimate_id: review.record_id,
			decision: "approve",
		});
		expect(forbidden.error?.code).toBe("FORBIDDEN");
		const events = await t.run((ctx) => ctx.db.query("event_log").collect());
		expect(events.at(-1)?.action).toBe("approval.blocked_attempt");
		expect(
			(
				await dispatch(actors.anthony, "approval.technical", {
					estimate_id: review.record_id,
					decision: "reject",
				})
			).error?.code,
		).toBe("VALIDATION");
		const rejected = await dispatch(actors.anthony, "approval.technical", {
			estimate_id: review.record_id,
			decision: "reject",
			reason: "Clarify scope",
		});
		expect(rejected).toMatchObject({ ok: true, status: "rework" });
	});

	it("replays create idempotently", async () => {
		const t = setup();
		const { johnny } = await seed(t);
		const args = {
			contract: "estimate.create",
			schema_version: 1,
			idempotency_key: "estimate-replay",
			payload: {
				lead_id: "lead_estimate",
				rate_set_version: "rs_approved",
				lines,
				assumptions: [],
			},
		};
		const first = await johnny.mutation(api.catalog.dispatch, args);
		expect(await johnny.mutation(api.catalog.dispatch, args)).toEqual(first);
		expect(
			await t.run((ctx) => ctx.db.query("estimates").collect()),
		).toHaveLength(1);
		expect(
			(await t.run((ctx) => ctx.db.query("event_log").collect())).filter(
				(event) => event.action === "estimate.created",
			),
		).toHaveLength(1);
	});
});
