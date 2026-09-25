// TC-BUILD-2 acceptance: identity.bind / identity.resolve per Build Pack §22.5.
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

const SUBJECT_ANTHONY = "https://clerk.test.local|user_anthony_001";
const SUBJECT_ANTHONY_ROTATED = "https://clerk.test.local|user_anthony_002";
const SUBJECT_CREW = "https://clerk.test.local|user_crew_001";

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

async function bindingRow(t: ReturnType<typeof setup>, key: string) {
	return t.run(async (ctx) => {
		return ctx.db
			.query("identity_bindings")
			.withIndex("by_key", (q) => q.eq("key", key))
			.unique();
	});
}

describe("identity.bind", () => {
	it("bootstrap ceremony: first-ever bind with no session succeeds", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");

		const result = await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});

		expect(result.status).toBe("active");
		expect(result.key.startsWith("bind_")).toBe(true);
		expect(result.superseded).toBeNull();

		const row = await bindingRow(t, result.key);
		expect(row?.user_id).toBe("usr_anthony");
		expect(row?.provider).toBe("clerk");
		expect(row?.provider_subject).toBe(SUBJECT_ANTHONY);
		expect(row?.status).toBe("active");
		expect(row?.created_by).toBe("system");
	});

	it("unauthenticated bind after bootstrap throws", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");
		await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});
		await seedUser(t, "usr_johnny", "Johnny Cage", "principal");

		await expect(
			t.mutation(api.identity.bind, {
				user_key: "usr_johnny",
				provider: "clerk",
				provider_subject: "https://clerk.test.local|user_johnny_001",
			}),
		).rejects.toThrow(/unauthenticated binds are forbidden after bootstrap/);
	});

	it("non-principal bind throws", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");
		await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});
		await seedUser(t, "usr_crew", "Crew Member", "crew");
		const anthonyAuthed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		await anthonyAuthed.mutation(api.identity.bind, {
			user_key: "usr_crew",
			provider: "clerk",
			provider_subject: SUBJECT_CREW,
		});
		await seedUser(t, "usr_viewer", "Viewer", "viewer");

		const crewAuthed = t.withIdentity({ tokenIdentifier: SUBJECT_CREW });
		await expect(
			crewAuthed.mutation(api.identity.bind, {
				user_key: "usr_viewer",
				provider: "clerk",
				provider_subject: "https://clerk.test.local|user_viewer_001",
			}),
		).rejects.toThrow(/owner or principal role required/);
	});

	it("supersedes (never deletes) the prior active binding for (user, provider)", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");

		const first = await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});
		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		const second = await authed.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY_ROTATED,
		});

		expect(second.superseded).toBe(first.key);

		const oldRow = await bindingRow(t, first.key);
		expect(oldRow?.status).toBe("superseded");
		expect(oldRow?.superseded_at).toBeTruthy();

		const newRow = await bindingRow(t, second.key);
		expect(newRow?.status).toBe("active");
	});

	it("is idempotent when re-binding the identical subject", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");

		const first = await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});
		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		const second = await authed.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});

		expect(second.key).toBe(first.key);
		expect(second.status).toBe("active");
	});

	it("rejects unknown users — no auto-provisioning (§22.5/B-04)", async () => {
		const t = setup();
		await expect(
			t.mutation(api.identity.bind, {
				user_key: "usr_nobody",
				provider: "clerk",
				provider_subject: SUBJECT_ANTHONY,
			}),
		).rejects.toThrow(/no auto-provisioning/);
	});

	it("rejects a subject already bound to a different user — UNIQUE(provider, provider_subject)", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");
		await seedUser(t, "usr_johnny", "Johnny Cage", "principal");

		await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});
		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		await expect(
			authed.mutation(api.identity.bind, {
				user_key: "usr_johnny",
				provider: "clerk",
				provider_subject: SUBJECT_ANTHONY,
			}),
		).rejects.toThrow(/already bound/);
	});
});

describe("identity.resolve", () => {
	it("resolves the session identity to the bound user", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");
		await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});

		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		const resolved = await authed.query(api.identity.resolve, {});

		expect(resolved).toEqual({
			user_key: "usr_anthony",
			display_name: "Anthony Briseno",
			role: "owner",
			status: "active",
		});
	});

	it("rejects unauthenticated callers", async () => {
		const t = setup();
		await expect(t.query(api.identity.resolve, {})).rejects.toThrow(
			/unauthenticated/,
		);
	});

	it("rejects sessions with no binding — request access, no auto-provisioning", async () => {
		const t = setup();
		const authed = t.withIdentity({
			tokenIdentifier: "https://clerk.test.local|user_stranger",
		});
		await expect(authed.query(api.identity.resolve, {})).rejects.toThrow(
			/no identity binding/,
		);
	});

	it("AT-05: rejects revoked bindings", async () => {
		const t = setup();
		await seedUser(t, "usr_anthony", "Anthony Briseno", "owner");
		const bound = await t.mutation(api.identity.bind, {
			user_key: "usr_anthony",
			provider: "clerk",
			provider_subject: SUBJECT_ANTHONY,
		});

		// Simulate revocation (privileged op; no unbind in TC-BUILD-2 scope).
		await t.run(async (ctx) => {
			const row = await ctx.db
				.query("identity_bindings")
				.withIndex("by_key", (q) => q.eq("key", bound.key))
				.unique();
			if (!row) throw new Error("test setup: binding row not found");
			await ctx.db.patch(row._id, {
				status: "revoked",
				revoked_at: new Date().toISOString(),
				revoked_reason: "test revocation",
			});
		});

		const authed = t.withIdentity({ tokenIdentifier: SUBJECT_ANTHONY });
		await expect(authed.query(api.identity.resolve, {})).rejects.toThrow(
			/revoked/,
		);
	});
});
