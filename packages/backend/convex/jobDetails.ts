import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { query } from "./_generated/server.js";

const detail = v.union(
	v.null(),
	v.object({
		identifier: v.string(),
		title: v.union(v.string(), v.null()),
		revision: v.number(),
		updatedAt: v.number(),
		status: v.union(v.string(), v.null()),
		jobType: v.union(v.string(), v.null()),
		address: v.union(v.string(), v.null()),
		city: v.union(v.string(), v.null()),
		state: v.union(v.string(), v.null()),
		startDate: v.union(v.string(), v.null()),
		projectedEndDate: v.union(v.string(), v.null()),
		percentComplete: v.union(v.number(), v.null()),
	}),
);

/** A narrow job read. The caller cannot supply or infer a tenant from arguments. */
export const get = query({
	args: { identifier: v.string() },
	returns: detail,
	handler: async (ctx, { identifier }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("UNAUTHENTICATED");
		const membership = await ctx.db
			.query("contractorOsMemberships")
			.withIndex("by_identity", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();
		if (!membership?.enabled) throw new Error("FORBIDDEN");
		const job = await ctx.runQuery(components.contractorOs.records.co_job.get, {
			tenantId: membership.tenantId,
			identifier,
		});
		if (!job) return null;
		return {
			identifier: job.identifier,
			title: job.title,
			revision: job.revision,
			updatedAt: job.updatedAt,
			status: job.properties.status ?? null,
			jobType: job.properties.job_type ?? null,
			address: job.properties.address ?? null,
			city: job.properties.city ?? null,
			state: job.properties.state ?? null,
			startDate: job.properties.start_date ?? null,
			projectedEndDate: job.properties.projected_end_date ?? null,
			percentComplete: job.properties.percent_complete ?? null,
		};
	},
});
