import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const JOHNNY_SUBJECT = "https://clerk.test.local|catalog_johnny";
const CREW_SUBJECT = "https://clerk.test.local|catalog_crew";

function setup() {
	return convexTest(schema, modules);
}

async function seedIdentity(
	t: ReturnType<typeof setup>,
	key: string,
	displayName: string,
	role: "owner" | "principal" | "crew" | "viewer" | "agent_owner",
	subject: string,
	tenantId = "catalog-test-tenant",
) {
	const now = new Date().toISOString();
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			key,
			display_name: displayName,
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
			tenantId,
			enabled: true,
			role: "admin",
		});
	});
	await t.mutation(api.identity.bind, {
		user_key: key,
		provider: "clerk",
		provider_subject: subject,
	});
}

function intakeArgs(idempotencyKey: string) {
	return {
		contract: "lead.capture",
		schema_version: 1,
		idempotency_key: idempotencyKey,
		payload: { title: "Test lead", source: "web_form" },
	};
}

describe("catalog.dispatch", () => {
	it("AT-03 resolves the event actor from the authenticated session", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT });

		const result = await authed.mutation(
			api.catalog.dispatch,
			intakeArgs("01KCATALOGAT03ACTOR000000"),
		);

		expect(result.ok).toBe(true);
		const event = await t.run((ctx) =>
			ctx.db
				.query("event_log")
				.filter((q) => q.eq(q.field("action"), "lead.captured"))
				.unique(),
		);
		expect(event?.actor_user_id).toBe("usr_johnny");
	});

	it("AT-04 returns FORBIDDEN and persists the crew member's blocked attempt", async () => {
		const t = setup();
		await seedIdentity(t, "usr_crew", "Crew User", "crew", CREW_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: CREW_SUBJECT });

		const result = await authed.mutation(api.catalog.dispatch, {
			contract: "lead.capture",
			schema_version: 1,
			idempotency_key: "01KCATALOGAT04BLOCK00000",
			payload: { title: "Denied lead", source: "phone" },
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("FORBIDDEN");
		const blocked = await t.run((ctx) =>
			ctx.db
				.query("event_log")
				.filter((q) => q.eq(q.field("action"), "catalog.blocked_attempt"))
				.unique(),
		);
		expect(blocked?.actor_user_id).toBe("usr_crew");
		expect(blocked?.reason).toContain("forbidden");
	});

	it("replays the original result without a duplicate lead or event", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT });
		const args = intakeArgs("01KCATALOGIDEMPOTENT00000");

		const first = await authed.mutation(api.catalog.dispatch, args);
		const second = await authed.mutation(api.catalog.dispatch, args);

		expect(second.record_id).toBe(first.record_id);
		expect(second).toEqual(first);
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

	it("returns NOT_FOUND and logs an unknown contract attempt", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT });

		const result = await authed.mutation(api.catalog.dispatch, {
			contract: "nope.doesNotExist",
			schema_version: 1,
			idempotency_key: "01KCATALOGUNKNOWN00000000",
			payload: {},
		});

		expect(result.error?.code).toBe("NOT_FOUND");
		const events = await t.run((ctx) => ctx.db.query("event_log").collect());
		expect(events).toHaveLength(1);
		expect(events[0]?.action).toBe("catalog.blocked_attempt");
		expect(events[0]?.entity_id).toBe("nope.doesNotExist");
	});

	it("returns UNAUTHENTICATED instead of throwing", async () => {
		const t = setup();
		const result = await t.mutation(
			api.catalog.dispatch,
			intakeArgs("01KCATALOGUNAUTH000000000"),
		);
		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("UNAUTHENTICATED");
	});
});

describe("catalog replay tenant boundary", () => {
	it("does not return tenant A's record_id or entity_refs to tenant B for the same key", async () => {
		const t = setup();
		const aSubject = "issuer|replay-a";
		const bSubject = "issuer|replay-b";
		await seedIdentity(
			t,
			"usr_replay_a",
			"A Operator",
			"principal",
			aSubject,
			"tenant-a",
		);
		const now = new Date().toISOString();
		await t.run(async (ctx) => {
			await ctx.db.insert("contractorOsMemberships", {
				tokenIdentifier: bSubject,
				tenantId: "tenant-b",
				enabled: true,
				role: "admin",
			});
			await ctx.db.insert("users", {
				key: "usr_replay_b",
				display_name: "B Operator",
				role: "principal",
				status: "active",
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
			await ctx.db.insert("identity_bindings", {
				key: "bind_replay_b",
				user_id: "usr_replay_b",
				provider: "clerk",
				provider_subject: bSubject,
				status: "active",
				bound_at: now,
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
		});
		const args = intakeArgs("same-key-across-tenants");
		const a = await t
			.withIdentity({ tokenIdentifier: aSubject })
			.mutation(api.catalog.dispatch, args);
		const b = await t
			.withIdentity({ tokenIdentifier: bSubject })
			.mutation(api.catalog.dispatch, args);
		expect(a.ok).toBe(true);
		expect(b.ok).toBe(true);
		expect(b.record_id).not.toBe(a.record_id);
		expect(b.entity_refs).not.toContain(a.record_id);
	});

	it("denies a disabled member replaying an authorized result", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT });
		const args = intakeArgs("01KCATALOGDISABLEDREPLAY000");
		const first = await authed.mutation(api.catalog.dispatch, args);
		expect(first.ok).toBe(true);
		await t.run(async (ctx) => {
			const membership = await ctx.db
				.query("contractorOsMemberships")
				.withIndex("by_identity", (q) =>
					q.eq("tokenIdentifier", JOHNNY_SUBJECT),
				)
				.unique();
			if (!membership) throw new Error("missing fixture membership");
			await ctx.db.patch(membership._id, { enabled: false });
		});
		const replay = await authed.mutation(api.catalog.dispatch, args);
		expect(replay.ok).toBe(false);
		expect(replay.error?.code).toBe("FORBIDDEN");
		expect(replay.record_id).toBeNull();
	});

	it("denies an anonymous replay of an authorized key", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const args = intakeArgs("01KCATALOGANONREPLAY000000");
		const first = await t
			.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT })
			.mutation(api.catalog.dispatch, args);
		expect(first.ok).toBe(true);
		const replay = await t.mutation(api.catalog.dispatch, args);
		expect(replay.ok).toBe(false);
		expect(replay.error?.code).toBe("UNAUTHENTICATED");
		expect(replay.record_id).toBeNull();
	});
});
