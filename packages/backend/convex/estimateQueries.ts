import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { PROVIDER_CLERK, requireActiveBinding } from "./identity";

const MAX_PAGE_SIZE = 50;
const INTERACTIVE_ROLES = new Set(["owner", "principal", "crew", "viewer"]);

const approvedEstimate = v.object({
	estimateKey: v.string(),
	leadKey: v.string(),
	version: v.number(),
	status: v.literal("approved"),
	baseTotalCents: v.number(),
});

export const listApproved = query({
	args: {
		leadId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	returns: v.object({
		page: v.array(approvedEstimate),
		isDone: v.boolean(),
		continueCursor: v.string(),
	}),
	handler: async (ctx, args) => {
		if (
			!Number.isInteger(args.paginationOpts.numItems) ||
			args.paginationOpts.numItems < 1 ||
			args.paginationOpts.numItems > MAX_PAGE_SIZE
		) {
			throw new Error(`page size must be between 1 and ${MAX_PAGE_SIZE}`);
		}

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("unauthenticated");
		const { user } = await requireActiveBinding(
			ctx.db,
			PROVIDER_CLERK,
			identity.tokenIdentifier,
		);
		if (user.status !== "active") throw new Error("user access denied");
		if (!INTERACTIVE_ROLES.has(user.role))
			throw new Error("role access denied");

		const membership = await ctx.db
			.query("contractorOsMemberships")
			.withIndex("by_identity", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();
		if (!membership?.enabled) throw new Error("company access denied");
		if (user.company_id !== membership.tenantId) {
			throw new Error("company access denied");
		}

		let lead = await ctx.db
			.query("leads")
			.withIndex("by_company_key", (q) =>
				q.eq("company_id", membership.tenantId).eq("key", args.leadId),
			)
			.unique();
		if (!lead) {
			lead = await ctx.db
				.query("leads")
				.withIndex("by_company_co_lead_id", (q) =>
					q.eq("company_id", membership.tenantId).eq("co_lead_id", args.leadId),
				)
				.unique();
		}
		if (!lead) {
			throw new Error("lead not found");
		}

		const result = await ctx.db
			.query("estimates")
			.withIndex("by_company_lead_status", (q) =>
				q
					.eq("company_id", membership.tenantId)
					.eq("lead_id", lead.key)
					.eq("status", "approved"),
			)
			.paginate(args.paginationOpts);

		return {
			page: result.page.map((estimate) => ({
				estimateKey: estimate.key,
				leadKey: lead.key,
				version: estimate.version,
				status: "approved" as const,
				baseTotalCents: estimate.base_total_cents,
			})),
			isDone: result.isDone,
			continueCursor: result.continueCursor,
		};
	},
});
