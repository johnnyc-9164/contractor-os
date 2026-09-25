import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server.js";

const role = v.union(
	v.literal("viewer"),
	v.literal("operator"),
	v.literal("admin"),
);

export const get = query({
	args: {},
	returns: v.object({
		role: v.union(role, v.null()),
		enabled: v.boolean(),
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");
		const membership = await ctx.db
			.query("contractorOsMemberships")
			.withIndex("by_identity", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();
		return {
			role: membership?.role ?? null,
			enabled: membership?.enabled ?? false,
		};
	},
});

// Trusted administrator-only setup. Never re-export this as a public mutation.
// Not called by this build. Establishing or changing access requires owner approval.
export const set = internalMutation({
	args: {
		tokenIdentifier: v.string(),
		tenantId: v.string(),
		enabled: v.boolean(),
		role,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const previous = await ctx.db
			.query("contractorOsMemberships")
			.withIndex("by_identity", (q) =>
				q.eq("tokenIdentifier", args.tokenIdentifier),
			)
			.unique();
		if (previous) await ctx.db.replace(previous._id, args);
		else await ctx.db.insert("contractorOsMemberships", args);
		return null;
	},
});
