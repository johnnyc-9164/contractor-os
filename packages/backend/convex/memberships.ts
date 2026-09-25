import { v } from "convex/values";
import { internalMutation } from "./_generated/server.js";

// Trusted administrator-only setup. Never re-export this as a public mutation.
// Not called by this build. Establishing or changing access requires owner approval.
export const set = internalMutation({
	args: {
		tokenIdentifier: v.string(),
		tenantId: v.string(),
		enabled: v.boolean(),
		role: v.union(
			v.literal("viewer"),
			v.literal("operator"),
			v.literal("admin"),
		),
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
