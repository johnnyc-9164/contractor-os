// TC-BUILD-3 §24.4 catalog dispatcher. Response envelopes extend the Build
// Pack shape with `ok` and an optional typed `error` on every response.
import { v } from "convex/values";
import { z } from "zod";
import { api } from "./_generated/api";
import { mutation } from "./_generated/server";
import type { ResolvedUser } from "./identity";
import * as opportunity from "./opportunity";

const intakeSchema = z.object({
	account_id: z.string().min(1),
	channel: z.string().min(1),
	contact_id: z.string().min(1).optional(),
});
const qualifySchema = z.object({ opportunity_key: z.string().min(1) });
const bidNoBidSchema = z
	.object({
		opportunity_key: z.string().min(1),
		bid_no_bid: z.boolean(),
		no_go_reason: z.string().min(1).optional(),
	})
	.superRefine((value, context) => {
		if (!value.bid_no_bid && !value.no_go_reason) {
			context.addIssue({
				code: "custom",
				path: ["no_go_reason"],
				message: "no_go_reason is required when bid_no_bid is false",
			});
		}
	});

type Authority = "Johnny" | "Anthony sub / Johnny" | "agent" | "website bridge";
type Operation = {
	name: string;
	authority: readonly Authority[];
	writes: readonly string[];
	guards: readonly string[];
	emits: string;
	schema: z.ZodType;
	run: (
		db: Parameters<typeof opportunity.intake>[0],
		payload: never,
		actor: ResolvedUser,
	) => Promise<opportunity.ServiceResult>;
};

// As-built authority assumptions: website bridge is an agent-class (`agt_*`)
// caller; "Anthony sub / Johnny" means either owner or principal.
export const OPERATIONS: Record<string, Operation> = {
	"opportunity.intake": {
		name: "opportunity.intake",
		authority: ["Johnny", "website bridge", "agent"],
		writes: ["opportunities"],
		guards: ["estimating.accept gates future walk/takeoff/estimate work"],
		emits: "opportunity.intake",
		schema: intakeSchema,
		run: opportunity.intake as Operation["run"],
	},
	"opportunity.qualify": {
		name: "opportunity.qualify",
		authority: ["Johnny"],
		writes: ["opportunities"],
		guards: ["estimating.accept gates future walk/takeoff/estimate work"],
		emits: "opportunity.qualify",
		schema: qualifySchema,
		run: opportunity.qualify as Operation["run"],
	},
	"opportunity.bidNoBid": {
		name: "opportunity.bidNoBid",
		authority: ["Anthony sub / Johnny"],
		writes: ["opportunities"],
		guards: [
			"no_go_reason required when bid_no_bid is false",
			"estimating.accept gates future walk/takeoff/estimate work",
		],
		emits: "opportunity.bidNoBid",
		schema: bidNoBidSchema,
		run: opportunity.bidNoBid as Operation["run"],
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
		if (entry === "Anthony sub / Johnny")
			return actor.role === "owner" || actor.role === "principal";
		return actor.user_key.startsWith("agt_");
	});
}

function entityKey(payload: unknown, fallback: string): string {
	if (payload && typeof payload === "object" && "opportunity_key" in payload) {
		const key = (payload as { opportunity_key?: unknown }).opportunity_key;
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
				action: "catalog.blocked_attempt",
				entity_type: "opportunity",
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
				entity_type: "opportunity",
				entity_key: entityKey(args.payload, args.idempotency_key),
				reason: `validation: ${JSON.stringify(detail)}`,
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: { code: "VALIDATION", detail },
			});
		}

		let result: opportunity.ServiceResult;
		try {
			result = await operation.run(ctx.db, parsed.data as never, actor);
		} catch (error) {
			// Blocked attempts are returned, not thrown (TC-BUILD-3 constraint):
			// every dispatch — success or blocked — must produce an event_log row.
			const detail = error instanceof Error ? error.message : String(error);
			await ctx.runMutation(api.events.append, {
				action: "catalog.blocked_attempt",
				entity_type: "opportunity",
				entity_key: entityKey(args.payload, args.idempotency_key),
				reason: `service: ${detail}`,
				source: "catalog.dispatch",
			});
			return envelope(args.contract, args.schema_version, {
				executor: actor.user_key,
				error: { code: "NOT_FOUND", detail },
			});
		}
		await ctx.runMutation(api.events.append, {
			action: operation.emits,
			entity_type: "opportunity",
			entity_key: result.record_id,
			...(result.from_state ? { from_state: result.from_state } : {}),
			...(result.to_state ? { to_state: result.to_state } : {}),
			source: "catalog.dispatch",
			idempotency_key: args.idempotency_key,
		});
		const response = envelope(args.contract, args.schema_version, {
			ok: true,
			record_id: result.record_id,
			entity_refs: [result.record_id],
			status: result.status,
			facts: { operation: operation.name },
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
			company_id: opportunity.COMPANY_ID,
		});
		return response;
	},
});
