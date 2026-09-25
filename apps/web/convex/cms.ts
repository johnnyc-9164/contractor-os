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
import { mutation, query } from "./_generated/server";

const cms = new Cms(components.cms);

async function requireIdentity(ctx: {
	auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("unauthenticated");
	return identity;
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
		await requireIdentity(ctx);
		// returns the new record id as an opaque string
		return await cms.site.create(ctx, args);
	},
});

export const getSite = query({
	args: { identifier: v.string() },
	handler: async (ctx, args) => {
		await requireIdentity(ctx);
		return await cms.site.get(ctx, args);
	},
});

export const listSites = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		await requireIdentity(ctx);
		return await cms.site.list(ctx, args);
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
		await requireIdentity(ctx);
		// optimistic concurrency: throws on revision conflict
		return await cms.site.update(ctx, args);
	},
});
