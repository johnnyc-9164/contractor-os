// TC-BUILD-2 acceptance: events.append / events.verifyChain per Build Pack §23.
import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api.js";
import { EVENT_CHAIN_GENESIS, sha256Hex, stableStringify } from "./events.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

const SUBJECT_ANTHONY = "https://clerk.test.local|user_anthony_001";
const SUBJECT_JOHNNY = "https://clerk.test.local|user_johnny_001";

function setup() {
	return convexTest(schema, modules);
}

async function seedUser(
	t: ReturnType<typeof setup>,
	key: string,
	displayName: string,
	role: "owner" | "principal" | "crew" | "viewer" | "agent_owner",
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			key,
			display_name: displayName,
			role,
			status: "active",
			created_by: "system",
			created_at: new Date().toISOString(),
			updated_by: "system",
			updated_at: new Date().toISOString(),
			source: "test",
			schema_version: 1,
			company_id: "co_skys",
		});
	});
}

async function seedBoundUser(
	t: ReturnType<typeof setup>,
	userKey: string,
	displayName: string,
	role: "owner" | "principal" | "crew" | "viewer" | "agent_owner",
	subject: string,
	// Authenticated owner/principal session for non-bootstrap binds.
	// Omit only for the first-ever bind (bootstrap ceremony).
	binder?: { mutation: typeof t.mutation },
) {
	await seedUser(t, userKey, displayName, role);
	const caller = binder ?? t;
	await caller.mutation(api.identity.bind, {
		user_key: userKey,
		provider: "clerk",
		provider_subject: subject,
	});
	return t.withIdentity({ tokenIdentifier: subject });
}

async function eventRows(t: ReturnType<typeof setup>) {
	return t.run(async (ctx) => {
		return ctx.db.query("event_log").order("asc").collect();
	});
}

describe("events.append", () => {
	it("writes a hash-chained event with the session-resolved actor", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);

		const result = await authed.mutation(api.events.append, {
			action: "test.ping",
			entity_type: "test_entity",
			entity_key: "tst_001",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.key.startsWith("evt_")).toBe(true);
		expect(result.prev_hash).toBe(EVENT_CHAIN_GENESIS);
		expect(result.event_hash).toMatch(/^[0-9a-f]{64}$/);

		const rows = await eventRows(t);
		expect(rows).toHaveLength(1);
		expect(rows[0].actor_user_id).toBe("usr_anthony");
		expect(rows[0].actor_display).toBe("Anthony Briseno");
		expect(rows[0].action).toBe("test.ping");
		expect(rows[0].entity_id).toBe("tst_001");
		expect(rows[0].prev_hash).toBe(EVENT_CHAIN_GENESIS);
	});

	it("AT-03: ignores client-supplied created_by — the session decides the actor", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);
		await seedUser(t, "usr_johnny", "Johnny Cage", "principal");

		await authed.mutation(api.events.append, {
			action: "test.spoof_attempt",
			entity_key: "tst_002",
			// The attacker claims to be Johnny; the session is Anthony.
			created_by: "usr_johnny",
		});

		const rows = await eventRows(t);
		expect(rows).toHaveLength(1);
		expect(rows[0].actor_user_id).toBe("usr_anthony");
		expect(rows[0].created_by).toBe("usr_anthony");
	});

	it("links each event to the previous event hash", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);

		const first = await authed.mutation(api.events.append, {
			action: "test.one",
			entity_key: "tst_001",
		});
		const second = await authed.mutation(api.events.append, {
			action: "test.two",
			entity_key: "tst_002",
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) throw new Error("expected ok");
		expect(second.prev_hash).toBe(first.event_hash);

		const rows = await eventRows(t);
		expect(rows[0].prev_hash).toBe(EVENT_CHAIN_GENESIS);
		expect(rows[1].prev_hash).toBe(rows[0].event_hash);
	});

	it("rejects unauthenticated callers", async () => {
		const t = setup();
		const result = await t.mutation(api.events.append, {
			action: "test.nope",
			entity_key: "tst_x",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected denial");
		expect(result.error).toMatch(/unauthenticated/);
	});

	it("AT-05: revoked binding → 403-style error AND auth.binding_revoked_use event", async () => {
		const t = setup();
		await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);

		// Revoke the binding (privileged op; direct row patch in test).
		await t.run(async (ctx) => {
			const row = await ctx.db
				.query("identity_bindings")
				.withIndex("by_provider_subject", (q) =>
					q.eq("provider", "clerk").eq("provider_subject", SUBJECT_ANTHONY),
				)
				.unique();
			if (!row) throw new Error("test setup: binding row not found");
			await ctx.db.patch(row._id, {
				status: "revoked",
				revoked_at: new Date().toISOString(),
				revoked_reason: "test revocation",
			});
		});

		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		// 403-style denial is RETURNED (a throw would roll back the blocked
		// event in Convex's transactional mutations).
		const result = await authed.mutation(api.events.append, {
			action: "test.blocked",
			entity_key: "tst_x",
		});
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected denial");
		expect(result.error).toMatch(/revoked/);
		expect(result.blocked_event_key).toBeTruthy();

		// The blocked attempt itself is an event (§23.2).
		const rows = await eventRows(t);
		expect(rows).toHaveLength(1);
		expect(rows[0].key).toBe(result.blocked_event_key);
		expect(rows[0].action).toBe("auth.binding_revoked_use");
		expect(rows[0].actor_user_id).toBe("usr_anthony");
	});

	it("idempotency: same idempotency_key twice → one event row, original returned", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);

		const first = await authed.mutation(api.events.append, {
			action: "test.idem",
			entity_key: "tst_idem",
			idempotency_key: "idem-001",
		});
		const second = await authed.mutation(api.events.append, {
			action: "test.idem",
			entity_key: "tst_idem",
			idempotency_key: "idem-001",
		});

		expect(first.ok).toBe(true);
		expect(second).toEqual(first);

		const rows = await eventRows(t);
		expect(rows).toHaveLength(1);
		if (!first.ok) throw new Error("expected ok");
		expect(rows[0].key).toBe(first.key);
	});
});

describe("events.verifyChain", () => {
	it("passes on a written sequence", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);
		await authed.mutation(api.events.append, {
			action: "test.a",
			entity_key: "t1",
		});
		await authed.mutation(api.events.append, {
			action: "test.b",
			entity_key: "t2",
		});
		await authed.mutation(api.events.append, {
			action: "test.c",
			entity_key: "t3",
		});

		const result = await t.query(api.events.verifyChain, {});
		expect(result.ok).toBe(true);
		expect(result.checked).toBe(3);
	});

	it("detects a tampered row (test-only sequence, direct patch simulates the attacker)", async () => {
		const t = setup();
		const authed = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);
		await authed.mutation(api.events.append, {
			action: "test.a",
			entity_key: "t1",
		});
		await authed.mutation(api.events.append, {
			action: "test.b",
			entity_key: "t2",
		});

		const rows = await eventRows(t);
		const victimKey = rows[0].key;

		// Simulate tampering with direct DB access (never via the API — §23.1
		// rule 4 forbids updates; this is the attacker model the chain guards).
		await t.run(async (ctx) => {
			await ctx.db.patch(rows[0]._id, { action: "test.TAMPERED" });
		});

		const result = await t.query(api.events.verifyChain, {});
		expect(result.ok).toBe(false);
		expect(result.first_bad_key).toBe(victimKey);
	});

	it("pins the canonical hash: known fixture → known event_hash", async () => {
		// If the canonical form (§23.3/F-05) ever changes, this breaks loudly.
		const fixture = {
			key: "evt_fixture_001",
			at: "2026-09-25T12:00:00.000Z",
			actor_user_id: "usr_anthony",
			actor_display: "Anthony Briseno",
			auth_provider: "clerk",
			action: "test.ping",
			entity_id: "tst_001",
			created_by: "usr_anthony",
			created_at: "2026-09-25T12:00:00.000Z",
			updated_by: "usr_anthony",
			updated_at: "2026-09-25T12:00:00.000Z",
			source: "convex_api",
			schema_version: 1,
			company_id: "co_skys",
		};
		const hash = await sha256Hex(
			stableStringify(fixture) + EVENT_CHAIN_GENESIS,
		);
		expect(hash).toBe(
			"a9820971914875438a4e371c2ef9593cfa9a93ed27c0392ffc41f44bcb045d1d",
		);
	});
});

describe("multi-user chain", () => {
	it("two bound users append to one shared chain", async () => {
		const t = setup();
		const anthony = await seedBoundUser(
			t,
			"usr_anthony",
			"Anthony Briseno",
			"owner",
			SUBJECT_ANTHONY,
		);
		const johnny = await seedBoundUser(
			t,
			"usr_johnny",
			"Johnny Cage",
			"principal",
			SUBJECT_JOHNNY,
			anthony,
		);

		const a1 = await anthony.mutation(api.events.append, {
			action: "test.a1",
			entity_key: "t1",
		});
		const j1 = await johnny.mutation(api.events.append, {
			action: "test.j1",
			entity_key: "t2",
		});

		expect(a1.ok).toBe(true);
		expect(j1.ok).toBe(true);
		if (!a1.ok || !j1.ok) throw new Error("expected ok");
		expect(j1.prev_hash).toBe(a1.event_hash);

		const rows = await eventRows(t);
		expect(rows.map((r) => r.actor_user_id)).toEqual([
			"usr_anthony",
			"usr_johnny",
		]);

		const check = await t.query(api.events.verifyChain, {});
		expect(check.ok).toBe(true);
		expect(check.checked).toBe(2);
	});
});

describe("timelineForLead (TC-LEAD-02)", () => {
	const JOHNNY_SUBJECT = "https://clerk.test.local|timeline_johnny";
	const TENANT_ID = "timeline-test-tenant";

	function setupBridge() {
		const t = convexTest(schema, modules);
		contractorOsTest.register(t);
		return t;
	}

	async function seedBridgeIdentity(
		t: ReturnType<typeof setupBridge>,
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

	function bridgeDispatchArgs(
		contract: string,
		payload: unknown,
		suffix: string,
	) {
		return {
			contract,
			schema_version: 1,
			idempotency_key: `01KLEAD${suffix.padEnd(19, "0").slice(0, 19)}`,
			payload,
		};
	}

	async function seedLeadWithEvents(t: ReturnType<typeof setupBridge>) {
		const authed = await seedBridgeIdentity(
			t,
			"usr_johnny",
			"principal",
			JOHNNY_SUBJECT,
		);
		await t.mutation(components.contractorOs.records.co_client.create, {
			tenantId: TENANT_ID,
			actorId: "seed",
			requestKey: "timeline-client",
			identifier: "client-timeline",
			title: "Timeline Client",
			properties: { status: "prospect" },
		});
		let request = 0;
		const dispatch = (contract: string, payload: unknown) =>
			authed.mutation(
				api.catalog.dispatch,
				bridgeDispatchArgs(
					contract,
					payload,
					`timeline-${String(++request).padStart(2, "0")}`,
				),
			);
		const captured = await dispatch("lead.capture", {
			title: "Timeline lead",
			source: "referral",
		});
		const localKey = captured.record_id as string;
		await dispatch("lead.sendOutreach", { lead_id: localKey, channel: "call" });
		await dispatch("lead.recordReply", {
			lead_id: localKey,
			reply_summary: "Interested",
		});
		const qualified = await dispatch("lead.qualify", {
			lead_id: localKey,
			client_name: "client-timeline",
			qualification_notes: "Qualified",
		});
		expect(qualified.ok, JSON.stringify(qualified)).toBe(true);
		// Envelope prepends record_id: entity_refs = [localKey, coLeadId]
		const coLeadId = qualified.entity_refs[1] as string;
		expect(coLeadId).toBeTruthy();
		return { authed, localKey, coLeadId };
	}

	it("returns events for a component co_lead identifier", async () => {
		const t = setupBridge();
		const { coLeadId, localKey } = await seedLeadWithEvents(t);
		const viaComponent = await t.query(api.events.timelineForLead, {
			lead_key: coLeadId,
		});
		const viaLocal = await t.query(api.events.timelineForLead, {
			lead_key: localKey,
		});
		expect(viaComponent.length).toBeGreaterThan(0);
		expect(viaComponent.map((r) => r.key)).toEqual(viaLocal.map((r) => r.key));
	});

	it("returns events for a local lead_<ulid> key (existing behavior)", async () => {
		const t = setupBridge();
		const { localKey } = await seedLeadWithEvents(t);
		const rows = await t.query(api.events.timelineForLead, {
			lead_key: localKey,
		});
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			expect(row.key).toBeTruthy();
			expect(row.at).toBeTruthy();
			expect(row.action).toBeTruthy();
		}
	});

	it("returns [] for an unknown identifier (no throw)", async () => {
		const t = setupBridge();
		await expect(
			t.query(api.events.timelineForLead, { lead_key: "lead_nonexistent_000" }),
		).resolves.toEqual([]);
		await expect(
			t.query(api.events.timelineForLead, { lead_key: "co_lead-nonexistent" }),
		).resolves.toEqual([]);
	});
});
