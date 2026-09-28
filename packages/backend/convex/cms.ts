/**
 * Example host-app facade for @johnnyc2026/cms.
 *
 * Copy into your host app's convex/ directory (e.g. convex/cms.ts).
 * Requires the host's own _generated codegen — this file is NOT typechecked
 * inside the @johnnyc2026/cms package; it is compile-verified in the consumer app.
 *
 * Architecture:
 *   React/Website
 *     -> HOST Convex functions (auth / tenant / permissions live here)
 *     -> ctx.runQuery / ctx.runMutation (via the Cms wrapper)
 *     -> components.cms.* (internal function references)
 *     -> CMS component
 *
 * Component functions are NEVER exposed to browser clients directly. Every
 * facade function below authenticates first via ctx.auth.getUserIdentity()
 * and throws before touching the component when there is no identity.
 * Add tenant resolution / role checks in the same place.
 */

import { Cms } from "@johnnyc2026/cms";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const cms = new Cms(components.cms);

async function requireTenant(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("unauthenticated");
	const membership = await ctx.db
		.query("contractorOsMemberships")
		.withIndex("by_identity", (q) =>
			q.eq("tokenIdentifier", identity.tokenIdentifier),
		)
		.unique();
	if (!membership?.enabled) throw new Error("tenant access denied");
	return membership.tenantId;
}

async function requireSiteTenant(
	ctx: QueryCtx | MutationCtx,
	siteIdentifier: string,
	tenantId: string,
) {
	const mapping = await ctx.db
		.query("cmsSiteTenants")
		.withIndex("by_site", (q) => q.eq("siteIdentifier", siteIdentifier))
		.unique();
	if (!mapping) throw new Error(`unmapped CMS site: ${siteIdentifier}`);
	if (mapping.tenantId !== tenantId) throw new Error("tenant access denied");
}

// Args below mirror the component's validators explicitly. For full strictness,
// reuse the component's validators instead of v.any() for properties/relations.

export const createSite = mutation({
	args: {
		identifier: v.string(),
		title: v.optional(v.string()),
		properties: v.any(),
		relations: v.optional(v.any()),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireTenant(ctx);
		// returns the new record id as an opaque string
		const id = await cms.site.create(ctx, args);
		const mapping = await ctx.db
			.query("cmsSiteTenants")
			.withIndex("by_site", (q) => q.eq("siteIdentifier", args.identifier))
			.unique();
		if (mapping && mapping.tenantId !== tenantId) {
			throw new Error("tenant access denied");
		}
		if (!mapping) {
			const now = new Date().toISOString();
			await ctx.db.insert("cmsSiteTenants", {
				siteIdentifier: args.identifier,
				tenantId,
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "cms_facade",
				schema_version: 1,
				company_id: "co_skys",
			});
		}
		return id;
	},
});

export const getSite = query({
	args: { identifier: v.string() },
	handler: async (ctx, args) => {
		const tenantId = await requireTenant(ctx);
		await requireSiteTenant(ctx, args.identifier, tenantId);
		return await cms.site.get(ctx, args);
	},
});

export const listSites = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		const tenantId = await requireTenant(ctx);
		const mappings = await ctx.db
			.query("cmsSiteTenants")
			.withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
			.paginate(args.paginationOpts);
		const page = await Promise.all(
			mappings.page.map(async ({ siteIdentifier }) => {
				const site = await cms.site.get(ctx, { identifier: siteIdentifier });
				if (!site) throw new Error("mapped CMS site is missing");
				return site;
			}),
		);
		return {
			page,
			isDone: mappings.isDone,
			continueCursor: mappings.continueCursor,
		};
	},
});

export const updateSite = mutation({
	args: {
		identifier: v.string(),
		expectedRevision: v.number(),
		title: v.optional(v.string()),
		properties: v.optional(v.any()),
		relations: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const tenantId = await requireTenant(ctx);
		await requireSiteTenant(ctx, args.identifier, tenantId);
		// optimistic concurrency: throws on revision conflict
		return await cms.site.update(ctx, args);
	},
});
