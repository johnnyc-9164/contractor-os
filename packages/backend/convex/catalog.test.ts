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
	});
	await t.mutation(api.identity.bind, {
		user_key: key,
		provider: "clerk",
		provider_subject: subject,
	});
}

function intakeArgs(idempotencyKey: string) {
	return {
		contract: "opportunity.intake",
		schema_version: 1,
		idempotency_key: idempotencyKey,
		payload: { account_id: "acct_test", channel: "website" },
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
				.filter((q) => q.eq(q.field("action"), "opportunity.intake"))
				.unique(),
		);
		expect(event?.actor_user_id).toBe("usr_johnny");
	});

	it("AT-04 returns FORBIDDEN and persists the crew member's blocked attempt", async () => {
		const t = setup();
		await seedIdentity(t, "usr_crew", "Crew User", "crew", CREW_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: CREW_SUBJECT });

		const result = await authed.mutation(api.catalog.dispatch, {
			contract: "opportunity.qualify",
			schema_version: 1,
			idempotency_key: "01KCATALOGAT04BLOCK00000",
			payload: { opportunity_key: "opp_does_not_matter" },
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

	it("replays the original result without a duplicate opportunity or event", async () => {
		const t = setup();
		await seedIdentity(t, "usr_johnny", "Johnny", "principal", JOHNNY_SUBJECT);
		const authed = t.withIdentity({ tokenIdentifier: JOHNNY_SUBJECT });
		const args = intakeArgs("01KCATALOGIDEMPOTENT00000");

		const first = await authed.mutation(api.catalog.dispatch, args);
		const second = await authed.mutation(api.catalog.dispatch, args);

		expect(second.record_id).toBe(first.record_id);
		expect(second).toEqual(first);
		const counts = await t.run(async (ctx) => ({
			opportunities: (await ctx.db.query("opportunities").collect()).length,
			events: (
				await ctx.db
					.query("event_log")
					.filter((q) => q.eq(q.field("action"), "opportunity.intake"))
					.collect()
			).length,
		}));
		expect(counts).toEqual({ opportunities: 1, events: 1 });
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
