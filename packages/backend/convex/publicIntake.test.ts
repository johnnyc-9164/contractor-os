import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const BRIDGE_SECRET = "test-bridge-secret";

function setup() {
	return convexTest(schema, modules);
}

function validArgs(overrides: Record<string, unknown> = {}) {
	return {
		bridgeSecret: BRIDGE_SECRET,
		idempotencyKey: "intake-001",
		fingerprint: "visitor-fingerprint",
		payload: {
			contactName: "Jamie Painter",
			email: "jamie@example.test",
			phone: "",
			projectType: "Interior painting",
			location: "Sacramento, CA",
			timeline: "Next month",
			notes: "Two bedrooms and hallway need repainting.",
			consent: true,
		},
		...overrides,
	};
}

async function seedSite(
	t: ReturnType<typeof setup>,
	{
		siteIdentifier = "paintpro-s03",
		tenantId = "tenant-a",
		enabled = true,
	}: { siteIdentifier?: string; tenantId?: string; enabled?: boolean } = {},
) {
	const now = new Date().toISOString();
	await t.run((ctx) =>
		ctx.db.insert("cmsSiteTenants", {
			siteIdentifier,
			tenantId,
			enabled,
			bridgeActorKey: "agt_website_bridge",
			bridgeActorDisplay: "Website bridge",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "test",
			schema_version: 1,
			company_id: "co_skys",
		}),
	);
}

async function seedLegacySiteWithoutEnabled(
	t: ReturnType<typeof setup>,
	{
		siteIdentifier = "paintpro-s03",
		tenantId = "tenant-a",
	}: { siteIdentifier?: string; tenantId?: string } = {},
) {
	const now = new Date().toISOString();
	await t.run((ctx) =>
		ctx.db.insert("cmsSiteTenants", {
			siteIdentifier,
			tenantId,
			bridgeActorKey: "agt_website_bridge",
			bridgeActorDisplay: "Website bridge",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "legacy-test",
			schema_version: 1,
			company_id: "co_skys",
		}),
	);
}

describe("public website intake", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.PUBLIC_INTAKE_SITE_IDENTIFIER = "paintpro-s03";
		process.env.PUBLIC_INTAKE_BRIDGE_SECRET = BRIDGE_SECRET;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("keeps generic catalog dispatch closed to anonymous callers", async () => {
		const t = setup();
		const result = await t.mutation(api.catalog.dispatch, {
			contract: "lead.capture",
			schema_version: 1,
			idempotency_key: "public-generic-dispatch",
			payload: { title: "Public", source: "web_form" },
		});
		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("UNAUTHENTICATED");
	});

	it("blocks direct mutation callers without the server bridge secret before writes", async () => {
		const missing = setup();
		await seedSite(missing);
		const missingSecret = validArgs({
			idempotencyKey: "missing-secret",
			fingerprint: "rotated-1",
			siteIdentifier: "attacker-site",
		});
		delete (missingSecret as { bridgeSecret?: string }).bridgeSecret;
		expect(
			await missing.mutation(api.publicIntake.submit, missingSecret),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
		const wrong = setup();
		await seedSite(wrong);
		expect(
			await wrong.mutation(
				api.publicIntake.submit,
				validArgs({
					bridgeSecret: "wrong-secret",
					idempotencyKey: "wrong-secret",
					fingerprint: "rotated-2",
					siteIdentifier: "attacker-site",
				}),
			),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
		for (const t of [missing, wrong]) {
			const rows = await t.run(async (ctx) => ({
				leads: await ctx.db.query("leads").collect(),
				events: await ctx.db.query("event_log").collect(),
				idempotency: await ctx.db.query("catalog_idempotency").collect(),
			}));
			expect(rows).toEqual({ leads: [], events: [], idempotency: [] });
		}
	});

	it("captures a valid anonymous request with server site tenancy, bridge provenance, consent evidence, and minimal response", async () => {
		const t = setup();
		await seedSite(t);
		const result = await t.mutation(api.publicIntake.submit, validArgs());
		expect(result).toEqual({ ok: true, received: true });
		const rows = await t.run(async (ctx) => ({
			leads: await ctx.db.query("leads").collect(),
			events: await ctx.db.query("event_log").collect(),
		}));
		expect(rows.leads).toHaveLength(1);
		expect(rows.leads[0]).toMatchObject({
			tenantId: "tenant-a",
			title: "Interior painting in Sacramento, CA",
			source: "web_form",
			contact_name: "Jamie Painter",
			contact_email: "jamie@example.test",
			stage: "Prospect",
			created_by: "agt_website_bridge",
			source_ref: "paintpro-s03",
		});
		expect(rows.events).toHaveLength(1);
		expect(rows.events[0]).toMatchObject({
			action: "lead.captured",
			actor_user_id: "agt_website_bridge",
			actor_display: "Website bridge",
			source: "website_bridge",
			source_ref: "paintpro-s03",
		});
		const consent = JSON.parse(rows.events[0]?.reason ?? "{}").consent;
		expect(consent).toMatchObject({
			accepted: true,
			policyVersion: "public-intake-v1",
		});
		expect(typeof consent.acceptedAt).toBe("string");
		expect(JSON.stringify(result)).not.toContain("tenant-a");
		expect(JSON.stringify(result)).not.toContain("lead_");
	});

	it("fails closed for missing or disabled site mappings before writing", async () => {
		const missing = setup();
		expect(
			await missing.mutation(api.publicIntake.submit, validArgs()),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
		expect(
			await missing.run((ctx) => ctx.db.query("leads").collect()),
		).toHaveLength(0);
		const disabled = setup();
		await seedSite(disabled, { enabled: false });
		expect(
			await disabled.mutation(api.publicIntake.submit, validArgs()),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
		expect(
			await disabled.run((ctx) => ctx.db.query("leads").collect()),
		).toHaveLength(0);
	});

	it("fails closed for legacy site mappings that omit enabled", async () => {
		const t = setup();
		await seedLegacySiteWithoutEnabled(t);
		expect(await t.mutation(api.publicIntake.submit, validArgs())).toEqual({
			ok: false,
			received: false,
			error: { code: "SITE_UNAVAILABLE" },
		});
		expect(await t.run((ctx) => ctx.db.query("leads").collect())).toHaveLength(
			0,
		);
	});

	it("rejects missing contact channel, missing consent, and spoofed tenant fields without writing", async () => {
		const t = setup();
		await seedSite(t);
		const noContact = validArgs({
			idempotencyKey: "no-contact",
			payload: { ...validArgs().payload, email: "", phone: "" },
		});
		const noConsent = validArgs({
			idempotencyKey: "no-consent",
			payload: { ...validArgs().payload, consent: false },
		});
		const spoofed = validArgs({
			idempotencyKey: "spoofed",
			payload: {
				...validArgs().payload,
				tenantId: "evil-tenant",
				actor: "usr_johnny",
				company_id: "evil-company",
			},
		});
		expect(await t.mutation(api.publicIntake.submit, noContact)).toMatchObject({
			ok: false,
			error: { code: "VALIDATION" },
		});
		expect(await t.mutation(api.publicIntake.submit, noConsent)).toMatchObject({
			ok: false,
			error: { code: "VALIDATION" },
		});
		expect(await t.mutation(api.publicIntake.submit, spoofed)).toMatchObject({
			ok: false,
			error: { code: "VALIDATION" },
		});
		expect(await t.run((ctx) => ctx.db.query("leads").collect())).toHaveLength(
			0,
		);
	});

	it("replays browser retries without duplicate leads, events, or consent evidence", async () => {
		const t = setup();
		await seedSite(t);
		const args = validArgs({ idempotencyKey: "retry-key" });
		const first = await t.mutation(api.publicIntake.submit, args);
		const replay = await t.mutation(api.publicIntake.submit, args);
		expect(replay).toEqual(first);
		const counts = await t.run(async (ctx) => {
			const idempotency = await ctx.db.query("catalog_idempotency").collect();
			const event = (await ctx.db.query("event_log").collect())[0];
			return {
				leads: (await ctx.db.query("leads").collect()).length,
				events: (await ctx.db.query("event_log").collect()).length,
				consent: JSON.parse(event?.reason ?? "{}").consent,
				replayConsent: JSON.parse(
					idempotency.find((row) => row.contract === "publicIntake.submit")
						?.result ?? "{}",
				).consent,
			};
		});
		expect(counts).toMatchObject({
			leads: 1,
			events: 1,
			consent: { accepted: true, policyVersion: "public-intake-v1" },
			replayConsent: { accepted: true, policyVersion: "public-intake-v1" },
		});
	});

	it("ignores direct mutation attempts to spoof the configured site", async () => {
		const t = setup();
		await seedSite(t, { siteIdentifier: "paintpro-s03", tenantId: "tenant-a" });
		await seedSite(t, {
			siteIdentifier: "attacker-site",
			tenantId: "tenant-b",
		});
		const result = await t.mutation(
			api.publicIntake.submit,
			validArgs({
				siteIdentifier: "attacker-site",
				idempotencyKey: "spoof-site",
			}),
		);
		expect(result).toEqual({ ok: true, received: true });
		const leads = await t.run((ctx) => ctx.db.query("leads").collect());
		expect(leads).toHaveLength(1);
		expect(leads[0]?.tenantId).toBe("tenant-a");
		expect(leads[0]?.source_ref).toBe("paintpro-s03");
	});

	it("scopes replay and abuse limits by server site and tenant", async () => {
		const t = setup();
		await seedSite(t, { siteIdentifier: "site-a", tenantId: "tenant-a" });
		await seedSite(t, { siteIdentifier: "site-b", tenantId: "tenant-b" });
		process.env.PUBLIC_INTAKE_SITE_IDENTIFIER = "site-a";
		const a = await t.mutation(
			api.publicIntake.submit,
			validArgs({ idempotencyKey: "same-key" }),
		);
		process.env.PUBLIC_INTAKE_SITE_IDENTIFIER = "site-b";
		const b = await t.mutation(
			api.publicIntake.submit,
			validArgs({ idempotencyKey: "same-key-b" }),
		);
		expect(a).toEqual({ ok: true, received: true });
		expect(b).toEqual({ ok: true, received: true });
		const tenants = await t.run(async (ctx) =>
			(await ctx.db.query("leads").collect())
				.map((lead) => lead.tenantId)
				.sort(),
		);
		expect(tenants).toEqual(["tenant-a", "tenant-b"]);
	});

	it("accepts four distinct legitimate visitors without tripping the site emergency cap", async () => {
		const t = setup();
		await seedSite(t);
		for (const [idempotencyKey, fingerprint] of [
			["visitor-1", "fingerprint-1"],
			["visitor-2", "fingerprint-2"],
			["visitor-3", "fingerprint-3"],
			["visitor-4", "fingerprint-4"],
		] as const) {
			expect(
				await t.mutation(
					api.publicIntake.submit,
					validArgs({ idempotencyKey, fingerprint }),
				),
			).toEqual({ ok: true, received: true });
		}
		const counts = await t.run(async (ctx) => ({
			leads: (await ctx.db.query("leads").collect()).length,
			events: (await ctx.db.query("event_log").collect()).length,
		}));
		expect(counts).toEqual({ leads: 4, events: 4 });
	});

	it("applies a site-owned emergency cap only after one hundred accepted submissions", async () => {
		const t = setup();
		await seedSite(t);
		for (let index = 1; index <= 100; index += 1) {
			expect(
				await t.mutation(
					api.publicIntake.submit,
					validArgs({
						idempotencyKey: `site-cap-${index}`,
						fingerprint: `visitor-${index}`,
					}),
				),
			).toEqual({ ok: true, received: true });
		}
		expect(
			await t.mutation(
				api.publicIntake.submit,
				validArgs({
					idempotencyKey: "site-cap-101",
					fingerprint: "visitor-101",
				}),
			),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "RATE_LIMITED" },
		});
		const counts = await t.run(async (ctx) => ({
			leads: (await ctx.db.query("leads").collect()).length,
			events: (await ctx.db.query("event_log").collect()).length,
		}));
		expect(counts).toEqual({ leads: 100, events: 100 });
	});

	it("rate limits repeated valid submissions for one site fingerprint", async () => {
		const t = setup();
		await seedSite(t);
		for (const idempotencyKey of ["r1", "r2", "r3"]) {
			expect(
				await t.mutation(
					api.publicIntake.submit,
					validArgs({ idempotencyKey, fingerprint: "burst" }),
				),
			).toEqual({ ok: true, received: true });
		}
		expect(
			await t.mutation(
				api.publicIntake.submit,
				validArgs({ idempotencyKey: "r4", fingerprint: "burst" }),
			),
		).toEqual({
			ok: false,
			received: false,
			error: { code: "RATE_LIMITED" },
		});
		expect(await t.run((ctx) => ctx.db.query("leads").collect())).toHaveLength(
			3,
		);
	});
});
