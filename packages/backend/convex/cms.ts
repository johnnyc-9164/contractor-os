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
const BRIDGE_ACTOR_KEY = "agt_website_bridge";
const BRIDGE_ACTOR_DISPLAY = "Website bridge";

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

async function requireAdminTenant(ctx: MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("unauthenticated");
	const membership = await ctx.db
		.query("contractorOsMemberships")
		.withIndex("by_identity", (q) =>
			q.eq("tokenIdentifier", identity.tokenIdentifier),
		)
		.unique();
	if (!membership?.enabled || membership.role !== "admin")
		throw new Error("tenant admin access denied");
	return { tenantId: membership.tenantId, actorId: identity.tokenIdentifier };
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

export const setPublicIntakeEnabled = mutation({
	args: {
		identifier: v.string(),
		enabled: v.boolean(),
	},
	returns: v.object({ enabled: v.boolean() }),
	handler: async (ctx, args) => {
		const { tenantId, actorId } = await requireAdminTenant(ctx);
		const mapping = await ctx.db
			.query("cmsSiteTenants")
			.withIndex("by_site", (q) => q.eq("siteIdentifier", args.identifier))
			.unique();
		if (!mapping) throw new Error("unmapped CMS site");
		if (mapping.tenantId !== tenantId) throw new Error("tenant access denied");
		const site = await cms.site.get(ctx, { identifier: args.identifier });
		if (!site) throw new Error("unknown CMS site");

		const needsActor =
			args.enabled &&
			(mapping.bridgeActorKey !== BRIDGE_ACTOR_KEY ||
				mapping.bridgeActorDisplay !== BRIDGE_ACTOR_DISPLAY);
		if ((mapping.enabled === true) !== args.enabled || needsActor) {
			await ctx.db.patch(mapping._id, {
				enabled: args.enabled,
				...(args.enabled
					? {
							bridgeActorKey: BRIDGE_ACTOR_KEY,
							bridgeActorDisplay: BRIDGE_ACTOR_DISPLAY,
						}
					: {}),
				updated_by: actorId,
				updated_at: new Date().toISOString(),
			});
		}
		return { enabled: args.enabled };
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
			.collect();
		const identifiers = new Set(mappings.map((row) => row.siteIdentifier));
		const result = await cms.site.list(ctx, args);
		// Filtering happens after component pagination, so a page may contain fewer
		// than numItems and callers may need to continue to find more tenant sites.
		return {
			...result,
			page: result.page.filter((site) => identifiers.has(site.identifier)),
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
