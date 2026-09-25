// TC-BUILD-2: Build Pack §23 event/audit model — the event writer.
//
// B-03: the event-writer is the ONLY write surface for event_log (writes are
// API-only, §23.1 rule 1). §23.6: the actor is resolved server-side from the
// session; client-supplied created_by is ignored (AT-03). §23.3: append-only,
// hash-chained (prev_hash → event_hash) over the canonical wire form.
// §23.2: blocked attempts also write events. Idempotency via outbox_receipts.

import { v } from "convex/values";
import type { DatabaseWriter } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { PROVIDER_CLERK } from "./identity";

const SCHEMA_VERSION = 1;
const COMPANY_ID = "co_skys";

// Genesis of the event hash chain (§23.4: cutover requires chain equality —
// same genesis, same head hash). The first event's prev_hash is this constant.
export const EVENT_CHAIN_GENESIS = "evt_genesis";

// Default event source when the caller does not name one. The Build Pack
// §23.1 source enum (sites_ui | website_bridge | …) belongs to the Sites/D1
// world; events written through this Convex port default to convex_api.
const DEFAULT_SOURCE = "convex_api";

function nowIso(): string {
	return new Date().toISOString();
}

function newKey(prefix: string): string {
	const rand = Math.random().toString(36).slice(2, 10);
	return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Canonical JSON (§23.3, F-05): keys sorted recursively, undefined fields
 * dropped, domain types only — NOT Convex storage types. Pinning to this form
 * is what keeps the chain verifiable across storage dialects.
 */
export function stableStringify(value: unknown): string {
	if (value === undefined) return "null";
	if (value === null) return "null";
	if (Array.isArray(value)) {
		return `[${value.map(stableStringify).join(",")}]`;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, fieldValue]) => fieldValue !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
		return `{${entries
			.map(
				([k, fieldValue]) =>
					`${JSON.stringify(k)}:${stableStringify(fieldValue)}`,
			)
			.join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

export async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export type WriteEventInput = {
	actor_user_id: string;
	actor_display: string;
	auth_provider?: string;
	action: string;
	entity_type?: string;
	/** Business key of the entity; stored in the event_log.entity_id column. */
	entity_key: string;
	entity_version?: number;
	from_state?: string;
	to_state?: string;
	decision_id?: string;
	jev_decision_id?: string;
	evidence_artifact_ids?: string;
	evidence_hash?: string;
	reason?: string;
	source?: string;
	source_ref?: string;
};

export type WriteEventResult = {
	key: string;
	event_hash: string;
	prev_hash: string;
	at: string;
};

/**
 * Result of the public `append`. Convex mutations are transactional: a throw
 * rolls back every write in the mutation, so a denied call CANNOT both write
 * its §23.2 blocked-attempt event and throw. The denial is therefore a
 * returned 403-style error, not an exception — the blocked event commits,
 * and the caller receives `{ ok: false, error }`.
 */
export type AppendResult =
	| ({ ok: true } & WriteEventResult)
	| { ok: false; error: string; blocked_event_key: string | null };

/**
 * The internal event writer. Appends one hash-chained event_log row and
 * returns its identity. Callers supply an explicitly-resolved actor —
 * the public `append` resolves it from the session (§23.6); blocked-attempt
 * paths (§23.2, AT-05) supply the known-but-unauthorized actor.
 *
 * event_hash = sha256(canonical JSON of the row content + prev_hash), where
 * the content is every row field except the Convex system fields (_id,
 * _creationTime) and the hash fields themselves (prev_hash, event_hash).
 */
export async function writeEvent(
	db: DatabaseWriter,
	input: WriteEventInput,
): Promise<WriteEventResult> {
	const head = await db.query("event_log").order("desc").first();
	const prev_hash = head ? head.event_hash : EVENT_CHAIN_GENESIS;

	const now = nowIso();
	const key = newKey("evt");
	const source = input.source ?? DEFAULT_SOURCE;

	const content = {
		key,
		at: now,
		actor_user_id: input.actor_user_id,
		actor_display: input.actor_display,
		...(input.auth_provider !== undefined
			? { auth_provider: input.auth_provider }
			: {}),
		action: input.action,
		...(input.entity_type !== undefined
			? { entity_type: input.entity_type }
			: {}),
		entity_id: input.entity_key,
		...(input.entity_version !== undefined
			? { entity_version: input.entity_version }
			: {}),
		...(input.from_state !== undefined ? { from_state: input.from_state } : {}),
		...(input.to_state !== undefined ? { to_state: input.to_state } : {}),
		...(input.decision_id !== undefined
			? { decision_id: input.decision_id }
			: {}),
		...(input.jev_decision_id !== undefined
			? { jev_decision_id: input.jev_decision_id }
			: {}),
		...(input.evidence_artifact_ids !== undefined
			? { evidence_artifact_ids: input.evidence_artifact_ids }
			: {}),
		...(input.evidence_hash !== undefined
			? { evidence_hash: input.evidence_hash }
			: {}),
		...(input.reason !== undefined ? { reason: input.reason } : {}),
		created_by: input.actor_user_id,
		created_at: now,
		updated_by: input.actor_user_id,
		updated_at: now,
		source,
		...(input.source_ref !== undefined ? { source_ref: input.source_ref } : {}),
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	};

	const event_hash = await sha256Hex(stableStringify(content) + prev_hash);

	await db.insert("event_log", { ...content, prev_hash, event_hash });

	return { key, event_hash, prev_hash, at: now };
}

/**
 * The event writer (§23.1–23.6, B-03). Behavior:
 * - Actor resolved server-side from ctx.auth → active identity binding
 *   (§23.6). Any client-supplied `created_by` is accepted and IGNORED (AT-03).
 * - Unauthenticated callers and unknown subjects → `{ ok: false }`.
 * - A revoked or superseded binding → `{ ok: false }` AFTER writing an
 *   `auth.binding_revoked_use` blocked-attempt event (§23.2, AT-05). The
 *   denial is returned, not thrown: a throw would roll back the blocked
 *   event in Convex's transactional mutations.
 * - Idempotency: a matching outbox_receipts row for `idempotency_key`
 *   returns the original result without writing (AT-02 pattern).
 */
export const append = mutation({
	args: {
		action: v.string(),
		entity_type: v.optional(v.string()),
		entity_key: v.string(),
		entity_version: v.optional(v.number()),
		from_state: v.optional(v.string()),
		to_state: v.optional(v.string()),
		decision_id: v.optional(v.string()),
		jev_decision_id: v.optional(v.string()),
		evidence_artifact_ids: v.optional(v.string()),
		evidence_hash: v.optional(v.string()),
		reason: v.optional(v.string()),
		source: v.optional(v.string()),
		source_ref: v.optional(v.string()),
		idempotency_key: v.optional(v.string()),
		// AT-03: accepted so callers can (incorrectly) supply it; ALWAYS ignored.
		created_by: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<AppendResult> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return {
				ok: false,
				error: "events.append: unauthenticated — no session identity (§23.6)",
				blocked_event_key: null,
			};
		}

		const binding = await ctx.db
			.query("identity_bindings")
			.withIndex("by_provider_subject", (q) =>
				q
					.eq("provider", PROVIDER_CLERK)
					.eq("provider_subject", identity.tokenIdentifier),
			)
			.unique();
		if (!binding) {
			return {
				ok: false,
				error:
					"events.append: no identity binding for this session — request access (§22.5/B-04)",
				blocked_event_key: null,
			};
		}
		if (binding.status !== "active") {
			// AT-05: the binding identifies the user, so the blocked attempt is
			// attributable — write the event, then deny via the return value.
			const boundUser = await ctx.db
				.query("users")
				.withIndex("by_key", (q) => q.eq("key", binding.user_id))
				.unique();
			let blockedKey: string | null = null;
			if (boundUser) {
				const blocked = await writeEvent(ctx.db, {
					actor_user_id: boundUser.key,
					actor_display: boundUser.display_name,
					auth_provider: PROVIDER_CLERK,
					action: "auth.binding_revoked_use",
					entity_type: "identity_binding",
					entity_key: binding.key,
					reason: `binding ${binding.key} is ${binding.status}`,
					source: "identity",
				});
				blockedKey = blocked.key;
			}
			return {
				ok: false,
				error: `events.append: binding ${binding.key} is ${binding.status} — access denied (AT-05)`,
				blocked_event_key: blockedKey,
			};
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_key", (q) => q.eq("key", binding.user_id))
			.unique();
		if (!user) {
			return {
				ok: false,
				error: `events.append: binding ${binding.key} references unknown user "${binding.user_id}"`,
				blocked_event_key: null,
			};
		}

		if (args.idempotency_key) {
			const receipt = await ctx.db
				.query("outbox_receipts")
				.withIndex("by_client_event", (q) =>
					q.eq("client_event_id", args.idempotency_key as string),
				)
				.unique();
			if (receipt) {
				return JSON.parse(receipt.result) as AppendResult;
			}
		}

		const now = nowIso();
		const result = await writeEvent(ctx.db, {
			actor_user_id: user.key,
			actor_display: user.display_name,
			auth_provider: PROVIDER_CLERK,
			action: args.action,
			entity_type: args.entity_type,
			entity_key: args.entity_key,
			entity_version: args.entity_version,
			from_state: args.from_state,
			to_state: args.to_state,
			decision_id: args.decision_id,
			jev_decision_id: args.jev_decision_id,
			evidence_artifact_ids: args.evidence_artifact_ids,
			evidence_hash: args.evidence_hash,
			reason: args.reason,
			source: args.source,
			source_ref: args.source_ref,
		});

		const okResult: AppendResult = { ok: true, ...result };

		if (args.idempotency_key) {
			await ctx.db.insert("outbox_receipts", {
				key: newKey("rcpt"),
				client_event_id: args.idempotency_key,
				received_at: now,
				applied_table: "event_log",
				applied_id: result.key,
				result: JSON.stringify(okResult),
				created_by: user.key,
				created_at: now,
				updated_by: user.key,
				updated_at: now,
				source: args.source ?? DEFAULT_SOURCE,
				schema_version: SCHEMA_VERSION,
				company_id: COMPANY_ID,
			});
		}

		return okResult;
	},
});

/**
 * Verify the event hash chain (§23.4 point 1): every row's event_hash
 * recomputes from its canonical form and links to the prior row's hash
 * (first row links to the genesis constant).
 */
export const verifyChain = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("event_log").order("asc").collect();
		let prev = EVENT_CHAIN_GENESIS;
		for (const row of rows) {
			const { _id, _creationTime, prev_hash, event_hash, ...content } = row;
			const recomputed = await sha256Hex(stableStringify(content) + prev);
			if (recomputed !== event_hash || prev_hash !== prev) {
				return { ok: false, checked: rows.length, first_bad_key: row.key };
			}
			prev = event_hash;
		}
		return { ok: true as const, checked: rows.length };
	},
});
