import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import cmsSchema from "../node_modules/@johnnyc2026/cms/src/component/schema.js";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const cmsModules = import.meta.glob(
	"../node_modules/@johnnyc2026/cms/src/component/**/*.ts",
);

function setup() {
	const t = convexTest(schema, modules);
	t.registerComponent("cms", cmsSchema, cmsModules);
	return t;
}

async function member(
	t: ReturnType<typeof setup>,
	tokenIdentifier: string,
	tenantId: string,
	role: "admin" | "operator" | "viewer",
	enabled = true,
) {
	await t.run((ctx) =>
		ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier,
			tenantId,
			role,
			enabled,
		}),
	);
	return t.withIdentity({ tokenIdentifier });
}

async function mapping(t: ReturnType<typeof setup>, identifier: string) {
	return t.run((ctx) =>
		ctx.db
			.query("cmsSiteTenants")
			.withIndex("by_site", (q) => q.eq("siteIdentifier", identifier))
			.unique(),
	);
}

async function createSite(
	admin: Awaited<ReturnType<typeof member>>,
	identifier: string,
) {
	await admin.mutation(api.cms.createSite, {
		identifier,
		title: identifier,
		properties: {
			key: identifier,
			name: identifier,
			default_locale: "en-US",
			primary_domain: `${identifier}.example.com`,
			status: "active",
		},
	});
}

describe("CMS public intake activation", () => {
	it("keeps new and legacy mappings disabled until an admin enables them; updates idempotently", async () => {
		const t = setup();
		const admin = await member(t, "issuer|admin", "tenant-a", "admin");
		await createSite(admin, "alpha");
		const before = await mapping(t, "alpha");
		expect(before?.enabled).not.toBe(true);

		await expect(
			admin.mutation(api.cms.setPublicIntakeEnabled, {
				identifier: "alpha",
				enabled: true,
			}),
		).resolves.toEqual({ enabled: true });
		const enabled = await mapping(t, "alpha");
		expect(enabled).toMatchObject({
			tenantId: "tenant-a",
			enabled: true,
			bridgeActorKey: "agt_website_bridge",
			bridgeActorDisplay: "Website bridge",
			updated_by: "issuer|admin",
		});
		expect(enabled?.updated_at).not.toBe(before?.updated_at);
		await admin.mutation(api.cms.setPublicIntakeEnabled, {
			identifier: "alpha",
			enabled: true,
		});
		expect(await mapping(t, "alpha")).toEqual(enabled);

		await expect(
			admin.mutation(api.cms.setPublicIntakeEnabled, {
				identifier: "alpha",
				enabled: false,
			}),
		).resolves.toEqual({ enabled: false });
		const disabled = await mapping(t, "alpha");
		expect(disabled?.enabled).toBe(false);
		await admin.mutation(api.cms.setPublicIntakeEnabled, {
			identifier: "alpha",
			enabled: false,
		});
		expect(await mapping(t, "alpha")).toEqual(disabled);
		expect(
			await t.run((ctx) => ctx.db.query("cmsSiteTenants").collect()),
		).toHaveLength(1);
	});

	it("rejects unauthenticated, non-admin, disabled, and cross-tenant callers without writes", async () => {
		const t = setup();
		const admin = await member(t, "issuer|admin", "tenant-a", "admin");
		await createSite(admin, "alpha");
		const viewer = await member(t, "issuer|viewer", "tenant-a", "viewer");
		const operator = await member(t, "issuer|operator", "tenant-a", "operator");
		const disabled = await member(
			t,
			"issuer|disabled",
			"tenant-a",
			"admin",
			false,
		);
		const other = await member(t, "issuer|other", "tenant-b", "admin");
		const before = await mapping(t, "alpha");
		const args = { identifier: "alpha", enabled: true };
		for (const caller of [t, viewer, operator, disabled, other]) {
			await expect(
				caller.mutation(api.cms.setPublicIntakeEnabled, args),
			).rejects.toThrow();
			expect(await mapping(t, "alpha")).toEqual(before);
		}
	});

	it("rejects unknown and orphaned sites without creating a mapping", async () => {
		const t = setup();
		const admin = await member(t, "issuer|admin", "tenant-a", "admin");
		await expect(
			admin.mutation(api.cms.setPublicIntakeEnabled, {
				identifier: "missing",
				enabled: true,
			}),
		).rejects.toThrow();
		expect(await mapping(t, "missing")).toBeNull();
		const now = new Date().toISOString();
		await t.run((ctx) =>
			ctx.db.insert("cmsSiteTenants", {
				siteIdentifier: "orphan",
				tenantId: "tenant-a",
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "legacy",
				schema_version: 1,
				company_id: "co_skys",
			}),
		);
		const before = await mapping(t, "orphan");
		await expect(
			admin.mutation(api.cms.setPublicIntakeEnabled, {
				identifier: "orphan",
				enabled: true,
			}),
		).rejects.toThrow();
		expect(await mapping(t, "orphan")).toEqual(before);
	});
});
