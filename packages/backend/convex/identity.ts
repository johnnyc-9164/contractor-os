// TC-BUILD-2: Build Pack §22.5 identity_bindings lifecycle + §23.6 session resolution.
//
// One authorization-gated write path (`identity.bind`, B-04). No
// auto-provisioning: the user row must already exist; an unknown subject lands
// on a "request access" hold and an authenticated owner/principal binds it
// explicitly. The sole exception is the one-time unauthenticated bootstrap
// ceremony before any binding exists. Bindings are superseded, never deleted.

import { v } from "convex/values";
import type { DatabaseReader } from "./_generated/server";
import { mutation, query } from "./_generated/server";

// Convex port of the §22.5 provider enum. The Sites/D1 world lists
// chatgpt_sites | supabase_auth; this port authenticates via Clerk
// (auth.config.ts, applicationID "convex"), so "clerk" is the only provider.
export const PROVIDER_CLERK = "clerk";

const SCHEMA_VERSION = 1;
const COMPANY_ID = "co_skys";

function nowIso(): string {
	return new Date().toISOString();
}

function newKey(prefix: string): string {
	const rand = Math.random().toString(36).slice(2, 10);
	return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export type ResolvedUser = {
	user_key: string;
	display_name: string;
	role: string;
	status: string;
};

/**
 * Shared binding → user lookup. Returns the user row for the ACTIVE binding
 * matching (provider, provider_subject). Throws when there is no binding or
 * the binding is not active (revoked/superseded) — the AT-05 rule.
 */
export async function requireActiveBinding(
	db: DatabaseReader,
	provider: string,
	providerSubject: string,
) {
	const binding = await db
		.query("identity_bindings")
		.withIndex("by_provider_subject", (q) =>
			q.eq("provider", provider).eq("provider_subject", providerSubject),
		)
		.unique();
	if (!binding) {
		throw new Error(
			"identity: no identity binding for this session — request access (§22.5/B-04, no auto-provisioning)",
		);
	}
	if (binding.status !== "active") {
		throw new Error(
			`identity: binding ${binding.key} is ${binding.status} — access denied (AT-05)`,
		);
	}
	const user = await db
		.query("users")
		.withIndex("by_key", (q) => q.eq("key", binding.user_id))
		.unique();
	if (!user) {
		throw new Error(
			`identity: binding ${binding.key} references unknown user "${binding.user_id}"`,
		);
	}
	return { binding, user };
}

/**
 * The ONE write path for identity_bindings (§22.5, B-04).
 *
 * - Authenticated callers must have an active Clerk binding and the `owner` or
 *   `principal` role.
 * - Bootstrap ceremony: an unauthenticated caller may create the first-ever
 *   binding only. Once any binding row exists, unauthenticated binds fail.
 * - The user must already exist in `users` (no auto-provisioning).
 * - UNIQUE(provider, provider_subject): one subject, one user, ever — a
 *   subject bound to a different user is rejected.
 * - Any existing ACTIVE binding for (user, provider) is superseded
 *   (status + superseded_at), never deleted.
 * - Re-binding the identical (user, provider, subject) is idempotent and
 *   returns the existing active row.
 */
export const bind = mutation({
	args: {
		user_key: v.string(),
		provider: v.literal(PROVIDER_CLERK),
		provider_subject: v.string(),
	},
	handler: async (ctx, args) => {
		const sessionIdentity = await ctx.auth.getUserIdentity();
		let actor: string;
		if (!sessionIdentity) {
			const existingBinding = await ctx.db.query("identity_bindings").first();
			if (existingBinding) {
				throw new Error(
					"identity.bind: unauthenticated binds are forbidden after bootstrap",
				);
			}
			actor = "system";
		} else {
			const { user: caller } = await requireActiveBinding(
				ctx.db,
				PROVIDER_CLERK,
				sessionIdentity.tokenIdentifier,
			);
			if (caller.role !== "owner" && caller.role !== "principal") {
				throw new Error("identity.bind: owner or principal role required");
			}
			actor = sessionIdentity.tokenIdentifier;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_key", (q) => q.eq("key", args.user_key))
			.unique();
		if (!user) {
			throw new Error(
				`identity.bind: unknown user_key "${args.user_key}" — no auto-provisioning (§22.5/B-04)`,
			);
		}

		const subjectClash = await ctx.db
			.query("identity_bindings")
			.withIndex("by_provider_subject", (q) =>
				q
					.eq("provider", args.provider)
					.eq("provider_subject", args.provider_subject),
			)
			.unique();
		if (subjectClash && subjectClash.user_id !== args.user_key) {
			throw new Error(
				`identity.bind: provider_subject already bound to user "${subjectClash.user_id}" — UNIQUE(provider, provider_subject) (§22.5)`,
			);
		}

		const now = nowIso();
		const existing = await ctx.db
			.query("identity_bindings")
			.withIndex("by_user_provider", (q) =>
				q.eq("user_id", args.user_key).eq("provider", args.provider),
			)
			.filter((q) => q.eq(q.field("status"), "active"))
			.first();

		if (existing) {
			if (existing.provider_subject === args.provider_subject) {
				return { key: existing.key, status: existing.status, superseded: null };
			}
			await ctx.db.patch(existing._id, {
				status: "superseded",
				superseded_at: now,
				updated_by: actor,
				updated_at: now,
			});
		}

		const key = newKey("bind");
		await ctx.db.insert("identity_bindings", {
			key,
			user_id: args.user_key,
			provider: args.provider,
			provider_subject: args.provider_subject,
			status: "active",
			bound_at: now,
			created_by: actor,
			created_at: now,
			updated_by: actor,
			updated_at: now,
			source: "identity.bind",
			schema_version: SCHEMA_VERSION,
			company_id: COMPANY_ID,
		});

		return {
			key,
			status: "active" as const,
			superseded: existing ? existing.key : null,
		};
	},
});

/**
 * Resolve the caller's Clerk session to the bound user (§23.6, §22.5).
 * Returns { user_key, display_name, role, status } for the ACTIVE binding.
 * `status` is the user's status (the binding is always active here).
 * Revoked/superseded bindings and unknown subjects → error (AT-05).
 */
export const resolve = query({
	args: {},
	handler: async (ctx): Promise<ResolvedUser> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error(
				"identity.resolve: unauthenticated — no session identity",
			);
		}
		const { user } = await requireActiveBinding(
			ctx.db,
			PROVIDER_CLERK,
			identity.tokenIdentifier,
		);
		return {
			user_key: user.key,
			display_name: user.display_name,
			role: user.role,
			status: user.status,
		};
	},
});
