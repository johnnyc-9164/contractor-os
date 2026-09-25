import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Example host adapter only. Merge/adapt to your existing trusted membership model;
// do not replace an existing application schema with this file.
// Exactly one active tenant selection per identity in this example.
export default defineSchema({
	contractorOsMemberships: defineTable({
		tokenIdentifier: v.string(),
		tenantId: v.string(),
		enabled: v.boolean(),
		role: v.union(
			v.literal("viewer"),
			v.literal("operator"),
			v.literal("admin"),
		),
	}).index("by_identity", ["tokenIdentifier"]),
});
