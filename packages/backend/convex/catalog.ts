// TC-BUILD-3 §24.4 catalog dispatcher. Response envelopes extend the Build
// Pack shape with `ok` and an optional typed `error` on every response.
import { v } from "convex/values";
import { z } from "zod";
import { api } from "./_generated/api";
import { type MutationCtx, mutation } from "./_generated/server";
import * as approvals from "./approvals";
import * as estimate from "./estimate";
import type { ResolvedUser } from "./identity";
import * as lead from "./lead";

const captureSchema = z.object({
	title: z.string().min(1),
	source: z.enum([
		"web_form",
		"phone",
		"referral",
		"portal",
		"walk_in",
		"other",
	]),
	contact_name: z.string().min(1).optional(),
	contact_phone: z.string().min(1).optional(),
	contact_email: z.string().min(1).optional(),
	notes: z.string().min(1).optional(),
});
const leadKeySchema = z.object({ lead_id: z.string().min(1) });
const sendOutreachSchema = leadKeySchema.extend({
	channel: z.enum(["call", "sms", "email", "in_person"]),
	message_ref: z.string().min(1).optional(),
});
const recordReplySchema = leadKeySchema.extend({
	reply_summary: z.string().min(1),
});
const qualifySchema = leadKeySchema.extend({
	client_name: z.string().min(1),
	client_type: z.string().min(1).optional(),
	qualification_notes: z.string().min(1).optional(),
});
const scheduleSiteVisitSchema = leadKeySchema.extend({
	scheduled_at: z.string().min(1),
	address: z.string().min(1).optional(),
	notes: z.string().min(1).optional(),
});
const startScopeSchema = leadKeySchema.extend({
	scope_notes: z.string().min(1).optional(),
	trade_spec_refs: z.array(z.string().min(1)).optional(),
});
const sendProposalSchema = leadKeySchema.extend({
	amount_cents: z.number().positive(),
	estimate_version_id: z.string().min(1),
	proposal_doc_ref: z.string().min(1).optional(),
});
const submitBidSchema = leadKeySchema.extend({
	bid_amount_cents: z.number().positive(),
});
const awardSchema = leadKeySchema.extend({
	awarded_at: z.string().min(1).optional(),
});
const winSchema = leadKeySchema.extend({
	contract_ref: z.string().min(1).optional(),
});
const reasonSchema = leadKeySchema.extend({ reason: z.string().min(1) });
const terminalSchema = z
	.object({
		lead_id: z.string().min(1),
		reason: z
			.enum(["no_show", "price", "timing", "fit", "duplicate", "other"])
			.optional(),
		reason_text: z.string().min(1).optional(),
	})
	.superRefine((value, context) => {
		if (!value.reason) {
			context.addIssue({
				code: "custom",
				path: ["reason"],
				message: "reason is required",
			});
		}
	});

const estimateLineSchema = z
	.object({
		rate_row_ref: z.string().min(1).optional(),
		kind: z.enum([
			"labor",
			"material",
			"equipment",
			"prep",
			"setup",
			"cleanup",
			"fee",
		]),
		label: z.string().min(1),
		quantity: z.number().positive(),
		unit: z.string().min(1),
		notes: z.string().min(1).optional(),
		burdened_pct: z.number().nonnegative().optional(),
		epistemic: z.string().min(1).optional(),
	})
	.strict();
const estimateCreateSchema = z
	.object({
		lead_id: z.string().min(1),
		rate_set_version: z.string().min(1),
		lines: z.array(estimateLineSchema).min(1),
		assumptions: z.array(
			z
				.object({
					text: z.string().min(1),
					owner: z.string().min(1).optional(),
				})
				.strict(),
		),
	})
	.strict();
const estimateRepriceSchema = z
	.object({
		estimate_id: z.string().min(1),
		changed_lines: z.array(estimateLineSchema).min(1).optional(),
		reason: z.string().min(1),
	})
	.strict();
const estimateKeySchema = z.object({ estimate_id: z.string().min(1) }).strict();
const estimateReasonSchema = estimateKeySchema.extend({
	reason: z.string().min(1),
});
const technicalSchema = z
	.object({
		estimate_id: z.string().min(1),
		decision: z.enum(["approve", "reject"]),
		reason: z.string().min(1).optional(),
	})
	.superRefine((value, context) => {
		if (value.decision === "reject" && !value.reason) {
			context.addIssue({
				code: "custom",
				path: ["reason"],
				message: "reason is required for reject",
			});
		}
	});

type Authority =
	| "Johnny"
	| "Anthony"
	| "Agent"
	| "System (website bridge)"
	| "System (webhook)";
type Operation = {
	name: string;
	authority: readonly Authority[];
	writes: readonly string[];
	guards: readonly string[];
	emits: string;
	schema: z.ZodType;
	run: (
		ctx: MutationCtx,
		payload: never,
		actor: ResolvedUser,
	) => Promise<lead.ServiceResult>;
};

// Agent, website-bridge, and webhook callers use agent-class (`agt_*`) keys.
export const OPERATIONS: Record<string, Operation> = {
	"estimate.create": {
		name: "estimate.create",
		authority: ["Johnny", "Agent"],
		writes: ["estimates", "estimate_lines", "assumptions"],
		guards: [
			"lead stage=Scope In Progress",
			"rate_set_version status=approved",
		],
		emits: "estimate.created",
		schema: estimateCreateSchema,
		run: estimate.create as Operation["run"],
	},
	"estimate.reprice": {
		name: "estimate.reprice",
		authority: ["Johnny", "Agent"],
		writes: ["new estimates version", "new estimate_lines"],
		guards: [
			"status in {draft, anthony_review, rework, approved}",
			"reason required",
		],
		emits: "estimate.repriced",
		schema: estimateRepriceSchema,
		run: estimate.reprice as Operation["run"],
	},
	"estimate.submitForReview": {
		name: "estimate.submitForReview",
		authority: ["Johnny"],
		writes: ["estimates: status=anthony_review"],
		guards: [
			"scope, takeoff, assumptions owned, approved rate, required line kinds, burdened labor, epistemic",
		],
		emits: "estimate.submitted",
		schema: estimateKeySchema,
		run: estimate.submitForReview as Operation["run"],
	},
	"approval.technical": {
		name: "approval.technical",
		authority: ["Anthony"],
		writes: ["decisions", "estimates: approved|rework"],
		guards: [
			"status=anthony_review",
			"submit gates rechecked",
			"validation gate",
		],
		emits: "technical.approved|technical.rejected",
		schema: technicalSchema,
		run: approvals.technical as Operation["run"],
	},
	"approval.commercial": {
		name: "approval.commercial",
		authority: ["Johnny"],
		writes: ["decisions"],
		guards: ["status=approved", "margin bounds warn only"],
		emits: "commercial.reviewed",
		schema: estimateKeySchema,
		run: approvals.commercial as Operation["run"],
	},
	"estimate.abandon": {
		name: "estimate.abandon",
		authority: ["Johnny", "Agent"],
		writes: ["estimates: status=abandoned"],
		guards: ["status=draft", "reason required"],
		emits: "estimate.abandoned",
		schema: estimateReasonSchema,
		run: estimate.abandon as Operation["run"],
	},
	"lead.capture": {
		name: "lead.capture",
		authority: ["Johnny", "Agent", "System (website bridge)"],
		writes: ["leads: stage=Prospect"],
		guards: [],
		emits: "lead.captured",
		schema: captureSchema,
		run: lead.capture as Operation["run"],
	},
	"lead.sendOutreach": {
		name: "lead.sendOutreach",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Outreach Sent"],
		guards: ["stage=Prospect"],
		emits: "lead.outreach_sent",
		schema: sendOutreachSchema,
		run: lead.sendOutreach as Operation["run"],
	},
	"lead.recordReply": {
		name: "lead.recordReply",
		authority: ["Johnny", "Agent", "System (webhook)"],
		writes: ["leads: stage=Reply Received"],
		guards: ["stage=Outreach Sent"],
		emits: "lead.reply_received",
		schema: recordReplySchema,
		run: lead.recordReply as Operation["run"],
	},
	"lead.qualify": {
		name: "lead.qualify",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Qualifying", "co_lead: stage=qualifying"],
		guards: ["stage=Reply Received"],
		emits: "lead.qualified",
		schema: qualifySchema,
		run: lead.qualify as Operation["run"],
	},
	"lead.scheduleSiteVisit": {
		name: "lead.scheduleSiteVisit",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Site Visit Scheduled", "co_site_visit"],
		guards: ["stage=Qualifying"],
		emits: "lead.site_visit_scheduled",
		schema: scheduleSiteVisitSchema,
		run: lead.scheduleSiteVisit as Operation["run"],
	},
	"lead.startScope": {
		name: "lead.startScope",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Scope In Progress", "co_scope"],
		guards: ["stage=Site Visit Scheduled"],
		emits: "lead.scope_started",
		schema: startScopeSchema,
		run: lead.startScope as Operation["run"],
	},
	"lead.sendProposal": {
		name: "lead.sendProposal",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Proposal Sent", "co_proposal"],
		guards: ["stage=Scope In Progress"],
		emits: "lead.proposal_sent",
		schema: sendProposalSchema,
		run: lead.sendProposal as Operation["run"],
	},
	"lead.submitBid": {
		name: "lead.submitBid",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Bid Submitted", "co_bid"],
		guards: ["stage=Proposal Sent"],
		emits: "lead.bid_submitted",
		schema: submitBidSchema,
		run: lead.submitBid as Operation["run"],
	},
	"lead.award": {
		name: "lead.award",
		authority: ["Johnny"],
		writes: ["leads: stage=Awarded"],
		guards: ["stage in {Proposal Sent, Bid Submitted}"],
		emits: "lead.awarded",
		schema: awardSchema,
		run: lead.award as Operation["run"],
	},
	"lead.win": {
		name: "lead.win",
		authority: ["Johnny"],
		writes: ["leads: stage=Won", "co_contract"],
		guards: ["stage in {Proposal Sent, Awarded}"],
		emits: "lead.won",
		schema: winSchema,
		run: lead.win as Operation["run"],
	},
	"lead.hold": {
		name: "lead.hold",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=On Hold", "co_lead: stage=on_hold"],
		guards: [
			"stage in {Qualifying, Site Visit Scheduled, Scope In Progress, Proposal Sent, Bid Submitted, Awarded}",
		],
		emits: "lead.held",
		schema: reasonSchema,
		run: lead.hold as Operation["run"],
	},
	"lead.resume": {
		name: "lead.resume",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Qualifying", "co_lead: stage=qualifying"],
		guards: ["stage=On Hold"],
		emits: "lead.resumed",
		schema: leadKeySchema,
		run: lead.resume as Operation["run"],
	},
	"lead.disqualify": {
		name: "lead.disqualify",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Disqualified"],
		guards: [
			"stage in {Prospect, Outreach Sent, Reply Received, Qualifying}",
			"reason required",
		],
		emits: "lead.disqualified",
		schema: terminalSchema,
		run: lead.disqualify as Operation["run"],
	},
	"lead.lose": {
		name: "lead.lose",
		authority: ["Johnny", "Agent"],
		writes: ["leads: stage=Lost", "co_lead: stage=lost when present"],
		guards: [
			"stage in {Outreach Sent, Reply Received, Qualifying, Site Visit Scheduled, Scope In Progress, Proposal Sent, Bid Submitted, Awarded, On Hold}",
			"reason required",
		],
		emits: "lead.lost",
		schema: terminalSchema,
		run: lead.lose as Operation["run"],
	},
	"lead.reopen": {
		name: "lead.reopen",
		authority: ["Johnny", "Agent"],
		writes: ["new leads record: stage=Prospect, reopened_from=source"],
		guards: ["stage in {Lost, Disqualified}", "Won rejected"],
		emits: "lead.reopened",
		schema: reasonSchema,
		run: lead.reopen as Operation["run"],
	},
};

type CatalogError = { code: string; detail?: unknown };
type Envelope = {
	ok: boolean;
	contract_name: string;
	schema_version: number;
	record_id: string | null;
	entity_refs: string[];
	status: string;
	facts: Record<string, unknown>;
	assumptions: unknown[];
	calculations: unknown[];
	unknowns: unknown[];
	blockers: unknown[];
	decisions: unknown[];
	evidence: unknown[];
	required_approvals: unknown[];
	next_actions: unknown[];
	executor: string | null;
	created_at: string;
	updated_at: string;
	supersedes: string | null;
	error?: CatalogError;
};

function envelope(
	contract: string,
	schemaVersion: number,
	options: Partial<Envelope> = {},
): Envelope {
	const now = new Date().toISOString();
	return {
		ok: false,
		contract_name: contract,
		schema_version: schemaVersion,
		record_id: null,
		entity_refs: [],
		status: "blocked",
		facts: {},
		assumptions: [],
		calculations: [],
		unknowns: [],
		blockers: [],
		decisions: [],
		evidence: [],
		required_approvals: [],
		next_actions: [],
		executor: null,
		created_at: now,
		updated_at: now,
		supersedes: null,
		...options,
	};
}

function isAuthorized(authority: readonly Authority[], actor: ResolvedUser) {
	return authority.some((entry) => {
		if (entry === "Johnny") return actor.role === "principal";
		if (entry === "Anthony") return actor.user_key === "usr_anthony";
		return actor.user_key.startsWith("agt_");
	});
}

function entityKey(payload: unknown, fallback: string): string {
	if (payload && typeof payload === "object" && "lead_id" in payload) {
		const key = (payload as { lead_id?: unknown }).lead_id;
		if (typeof key === "string") return key;
	}
	if (payload && typeof payload === "object" && "estimate_id" in payload) {
		const key = (payload as { estimate_id?: unknown }).estimate_id;
		if (typeof key === "string") return key;
	}
	return fallback;
}

export const dispatch = mutation({
	args: {
		contract: v.string(),
		schema_version: v.number(),
		idempotency_key: v.string(),
		payload: v.any(),
	},
	handler: async (ctx, args): Promise<Envelope> => {
		const replay = await ctx.db
			.query("catalog_idempotency")
			.withIndex("by_key", (q) => q.eq("key", args.idempotency_key))
			.unique();
		if (replay) return JSON.parse(replay.result) as Envelope;

		let actor: ResolvedUser;
		try {
			actor = await ctx.runQuery(api.identity.resolve, {});
		} catch {
			return envelope(args.contract, args.schema_version, {
				error: { code: "UNAUTHENTICATED" },
			});
		}

		const operation = OPERATIONS[args.contract];
		if (!operation) {
			await ctx.runMutation(api.events.append, {
				action: "catalog.blocked_attempt",
				entity_type: "catalog_contract",
				entity_key: args.contract,
				reason: "unknown contract",
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: { code: "NOT_FOUND" },
			});
		}

		if (!isAuthorized(operation.authority, actor)) {
			await ctx.runMutation(api.events.append, {
				action: args.contract.startsWith("approval.")
					? "approval.blocked_attempt"
					: "catalog.blocked_attempt",
				entity_type: args.contract.startsWith("lead.") ? "lead" : "estimate",
				entity_key: entityKey(args.payload, args.idempotency_key),
				reason: `forbidden: requires ${operation.authority.join(" or ")}`,
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: {
					code: "FORBIDDEN",
					detail: { required_role: operation.authority.join(" or ") },
				},
			});
		}

		const parsed = operation.schema.safeParse(args.payload);
		if (!parsed.success) {
			const detail = parsed.error.flatten();
			await ctx.runMutation(api.events.append, {
				action: "catalog.blocked_attempt",
				entity_type: "lead",
				entity_key: entityKey(args.payload, args.idempotency_key),
				reason: `validation: ${JSON.stringify(detail)}`,
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: { code: "VALIDATION", detail },
			});
		}

		let result: lead.ServiceResult;
		try {
			result = await operation.run(ctx, parsed.data as never, actor);
		} catch (error) {
			// Blocked attempts are returned, not thrown (TC-BUILD-3 constraint):
			// every dispatch — success or blocked — must produce an event_log row.
			const detail = error instanceof Error ? error.message : String(error);
			await ctx.runMutation(api.events.append, {
				action: args.contract.startsWith("approval.")
					? "approval.blocked_attempt"
					: "catalog.blocked_attempt",
				entity_type: args.contract.startsWith("lead.") ? "lead" : "estimate",
				entity_key: entityKey(args.payload, args.idempotency_key),
				reason: `service: ${detail}`,
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: {
					code:
						error instanceof lead.LeadServiceError ||
						error instanceof estimate.EstimateServiceError
							? error.code
							: "VALIDATION",
					detail,
				},
			});
		}
		await ctx.runMutation(api.events.append, {
			action: result.event_action ?? operation.emits,
			entity_type: args.contract.startsWith("lead.") ? "lead" : "estimate",
			entity_key: result.record_id,
			...(result.from_state ? { from_state: result.from_state } : {}),
			...(result.to_state ? { to_state: result.to_state } : {}),
			...(result.reason ? { reason: result.reason } : {}),
			source: "catalog.dispatch",
			idempotency_key: args.idempotency_key,
		});
		const response = envelope(args.contract, args.schema_version, {
			ok: true,
			record_id: result.record_id,
			entity_refs: [result.record_id, ...(result.entity_refs ?? [])],
			status: result.status,
			facts: { operation: operation.name, ...result.facts },
			executor: actor.user_key,
		});
		await ctx.db.insert("catalog_idempotency", {
			key: args.idempotency_key,
			contract: args.contract,
			result: JSON.stringify(response),
			created_by: actor.user_key,
			created_at: response.created_at,
			updated_by: actor.user_key,
			updated_at: response.created_at,
			source: "catalog.dispatch",
			schema_version: args.schema_version,
			company_id: lead.COMPANY_ID,
		});
		return response;
	},
});
