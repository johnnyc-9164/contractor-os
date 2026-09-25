import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import cmsSchema from "../node_modules/@johnnyc2026/cms/src/component/schema.js";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const cmsModules = import.meta.glob(
	"../node_modules/@johnnyc2026/cms/src/component/**/*.ts",
);
const paginationOpts = { cursor: null, numItems: 100 };

function setup() {
	const t = convexTest(schema, modules);
	t.registerComponent("cms", cmsSchema, cmsModules);
	return t;
}

async function addTenant(
	t: ReturnType<typeof setup>,
	tokenIdentifier: string,
	tenantId: string,
) {
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

const siteArgs = (identifier: string, idempotencyKey?: string) => ({
	identifier,
	title: identifier,
	properties: {
		key: identifier,
		name: identifier,
		default_locale: "en-US",
		primary_domain: `${identifier}.example.com`,
		status: "active" as const,
	},
	idempotencyKey,
});

describe("CMS facade tenant isolation", () => {
	it("allows same-tenant create, read, list, and update", async () => {
		const t = setup();
		const tenant = await addTenant(t, "issuer|alice", "tenant-a");

		await tenant.mutation(api.cms.createSite, siteArgs("alpha"));
		expect(
			await tenant.query(api.cms.getSite, { identifier: "alpha" }),
		).toEqual(expect.objectContaining({ identifier: "alpha", revision: 1 }));
		expect(
			(await tenant.query(api.cms.listSites, { paginationOpts })).page,
		).toEqual([expect.objectContaining({ identifier: "alpha" })]);
		await expect(
			tenant.mutation(api.cms.updateSite, {
				identifier: "alpha",
				expectedRevision: 1,
				title: "Updated",
			}),
		).resolves.toBe(2);
	});

	it("rejects cross-tenant read and write and filters lists", async () => {
		const t = setup();
		const tenantA = await addTenant(t, "issuer|alice", "tenant-a");
		const tenantB = await addTenant(t, "issuer|bob", "tenant-b");
		await tenantA.mutation(api.cms.createSite, siteArgs("alpha"));

		await expect(
			tenantB.query(api.cms.getSite, { identifier: "alpha" }),
		).rejects.toThrow();
		await expect(
			tenantB.mutation(api.cms.updateSite, {
				identifier: "alpha",
				expectedRevision: 1,
				title: "Stolen",
			}),
		).rejects.toThrow();
		expect(
			(await tenantB.query(api.cms.listSites, { paginationOpts })).page,
		).toEqual([]);
	});

	it("rejects a cross-tenant idempotent create replay", async () => {
		const t = setup();
		const tenantA = await addTenant(t, "issuer|alice", "tenant-a");
		const tenantB = await addTenant(t, "issuer|bob", "tenant-b");
		await tenantA.mutation(
			api.cms.createSite,
			siteArgs("alpha", "create-alpha"),
		);

		await expect(
			tenantB.mutation(api.cms.createSite, siteArgs("alpha", "create-alpha")),
		).rejects.toThrow();
	});

	it("rejects unauthenticated access to all four operations", async () => {
		const t = setup();

		await expect(
			t.mutation(api.cms.createSite, siteArgs("alpha")),
		).rejects.toThrow("unauthenticated");
		await expect(
			t.query(api.cms.getSite, { identifier: "alpha" }),
		).rejects.toThrow("unauthenticated");
		await expect(
			t.query(api.cms.listSites, { paginationOpts }),
		).rejects.toThrow("unauthenticated");
		await expect(
			t.mutation(api.cms.updateSite, {
				identifier: "alpha",
				expectedRevision: 1,
			}),
		).rejects.toThrow("unauthenticated");
	});
});
