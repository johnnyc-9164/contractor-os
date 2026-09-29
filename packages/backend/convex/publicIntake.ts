import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { writeEvent } from "./events";
import type { ResolvedUser } from "./identity";
import * as lead from "./lead";

const SCHEMA_VERSION = 1;
const MAX_PER_VISITOR_WINDOW = 3;
const MAX_PER_SITE_WINDOW = 100;
const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_BRIDGE_ACTOR_KEY = "agt_website_bridge";
const DEFAULT_BRIDGE_ACTOR_DISPLAY = "Website bridge";

const successResponse = v.object({
	ok: v.literal(true),
	received: v.literal(true),
});
const failureResponse = v.object({
	ok: v.literal(false),
	received: v.literal(false),
	error: v.object({ code: v.string() }),
});

const responseValidator = v.union(successResponse, failureResponse);

type PublicIntakeResponse =
	| { ok: true; received: true }
	| { ok: false; received: false; error: { code: string } };

type PublicIntakePayload = {
	contactName: string;
	email?: string;
	phone?: string;
	projectType: string;
	location: string;
	timeline?: string;
	notes?: string;
	consent: boolean;
	consentPolicyVersion?: string;
	tenantId?: string;
	actor?: string;
	company_id?: string;
};

type NormalizedPayload = {
	contactName: string;
	email?: string;
	phone?: string;
	projectType: string;
	location: string;
	timeline?: string;
	notes?: string;
	consentPolicyVersion: string;
};

type ConsentEvidence = {
	accepted: true;
	acceptedAt: string;
	policyVersion: string;
};

function fail(code: string): PublicIntakeResponse {
	return { ok: false, received: false, error: { code } };
}

function configuredSiteIdentifier() {
	return process.env.PUBLIC_INTAKE_SITE_IDENTIFIER?.trim() || null;
}

function clean(value: string | undefined) {
	return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function validEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function validPhone(value: string) {
	return value.replace(/\D/gu, "").length >= 10;
}

function normalize(
	payload: PublicIntakePayload,
): { ok: true; payload: NormalizedPayload } | { ok: false } {
	if (payload.tenantId || payload.actor || payload.company_id)
		return { ok: false };
	if (!payload.consent) return { ok: false };
	const contactName = clean(payload.contactName);
	const email = clean(payload.email).toLowerCase();
	const phone = clean(payload.phone);
	const projectType = clean(payload.projectType);
	const location = clean(payload.location);
	const timeline = clean(payload.timeline);
	const notes = clean(payload.notes);
	const consentPolicyVersion =
		clean(payload.consentPolicyVersion) || "public-intake-v1";
	if (!contactName || !projectType || !location) return { ok: false };
	if (!email && !phone) return { ok: false };
	if (email && !validEmail(email)) return { ok: false };
	if (phone && !validPhone(phone)) return { ok: false };
	return {
		ok: true,
		payload: {
			contactName,
			...(email ? { email } : {}),
			...(phone ? { phone } : {}),
			projectType,
			location,
			...(timeline ? { timeline } : {}),
			...(notes ? { notes } : {}),
			consentPolicyVersion,
		},
	};
}

function stable(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`)
		.join(",")}}`;
}

async function sha256Hex(input: string) {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function siteMapping(ctx: MutationCtx, siteIdentifier: string) {
	return ctx.db
		.query("cmsSiteTenants")
		.withIndex("by_site", (q) => q.eq("siteIdentifier", siteIdentifier))
		.unique();
}

async function replayResponse(
	ctx: MutationCtx,
	key: string,
	requestHash: string,
): Promise<PublicIntakeResponse | null> {
	const replay = await ctx.db
		.query("catalog_idempotency")
		.withIndex("by_key", (q) => q.eq("key", key))
		.unique();
	if (!replay) return null;
	const stored = JSON.parse(replay.result) as {
		requestHash: string;
		response: PublicIntakeResponse;
	};
	if (stored.requestHash !== requestHash) return fail("VALIDATION");
	return stored.response;
}

type AbuseBucket = {
	key: string;
	count: number;
	id?: string;
};

async function loadAbuseBucket(
	ctx: MutationCtx,
	key: string,
): Promise<AbuseBucket> {
	const existing = await ctx.db
		.query("catalog_idempotency")
		.withIndex("by_key", (q) => q.eq("key", key))
		.unique();
	if (!existing) return { key, count: 0 };
	const value = JSON.parse(existing.result) as { count: number };
	return { key, count: value.count, id: existing._id };
}

async function saveAbuseBucket(
	ctx: MutationCtx,
	bucket: AbuseBucket,
	now: Date,
) {
	if (bucket.id) {
		await ctx.db.patch(bucket.id, {
			result: JSON.stringify({ count: bucket.count + 1 }),
			updated_at: now.toISOString(),
		});
		return;
	}
	await ctx.db.insert("catalog_idempotency", {
		key: bucket.key,
		contract: "publicIntake.abuseBucket",
		result: JSON.stringify({ count: 1 }),
		created_by: "system",
		created_at: now.toISOString(),
		updated_by: "system",
		updated_at: now.toISOString(),
		source: "public_intake",
		schema_version: SCHEMA_VERSION,
		company_id: lead.COMPANY_ID,
	});
}

async function checkAndIncrementAbuseBuckets(
	ctx: MutationCtx,
	tenantId: string,
	siteIdentifier: string,
	fingerprint: string,
	now: Date,
) {
	const windowStart = Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS;
	const siteKey = JSON.stringify([
		"public-intake-abuse-site",
		tenantId,
		siteIdentifier,
		windowStart,
	]);
	const visitorKey = JSON.stringify([
		"public-intake-abuse-visitor",
		tenantId,
		siteIdentifier,
		fingerprint,
		windowStart,
	]);
	const siteBucket = await loadAbuseBucket(ctx, siteKey);
	const visitorBucket = await loadAbuseBucket(ctx, visitorKey);
	if (siteBucket.count >= MAX_PER_SITE_WINDOW) return false;
	if (visitorBucket.count >= MAX_PER_VISITOR_WINDOW) return false;
	await saveAbuseBucket(ctx, siteBucket, now);
	await saveAbuseBucket(ctx, visitorBucket, now);
	return true;
}

export const submit = mutation({
	args: {
		siteIdentifier: v.optional(v.string()),
		bridgeSecret: v.optional(v.string()),
		idempotencyKey: v.string(),
		fingerprint: v.string(),
		payload: v.object({
			contactName: v.string(),
			email: v.optional(v.string()),
			phone: v.optional(v.string()),
			projectType: v.string(),
			location: v.string(),
			timeline: v.optional(v.string()),
			notes: v.optional(v.string()),
			consent: v.boolean(),
			consentPolicyVersion: v.optional(v.string()),
			tenantId: v.optional(v.string()),
			actor: v.optional(v.string()),
			company_id: v.optional(v.string()),
		}),
	},
	returns: responseValidator,
	handler: async (ctx, args): Promise<PublicIntakeResponse> => {
		const expectedBridgeSecret = process.env.PUBLIC_INTAKE_BRIDGE_SECRET;
		if (!expectedBridgeSecret || args.bridgeSecret !== expectedBridgeSecret) {
			return fail("SITE_UNAVAILABLE");
		}
		const siteIdentifier = configuredSiteIdentifier();
		if (!siteIdentifier) return fail("SITE_UNAVAILABLE");
		const mapping = await siteMapping(ctx, siteIdentifier);
		if (!mapping?.enabled) return fail("SITE_UNAVAILABLE");
		const normalized = normalize(args.payload);
		if (!normalized.ok) return fail("VALIDATION");
		const idempotencyKey = clean(args.idempotencyKey);
		const fingerprint = clean(args.fingerprint);
		if (!idempotencyKey || !fingerprint) return fail("VALIDATION");
		const requestHash = await sha256Hex(stable(normalized.payload));
		const replayKey = JSON.stringify([
			"public-intake",
			mapping.tenantId,
			siteIdentifier,
			idempotencyKey,
		]);
		const replay = await replayResponse(ctx, replayKey, requestHash);
		if (replay) return replay;
		const now = new Date();
		if (
			!(await checkAndIncrementAbuseBuckets(
				ctx,
				mapping.tenantId,
				siteIdentifier,
				fingerprint,
				now,
			))
		) {
			return fail("RATE_LIMITED");
		}
		const actor: ResolvedUser = {
			user_key: mapping.bridgeActorKey ?? DEFAULT_BRIDGE_ACTOR_KEY,
			display_name: mapping.bridgeActorDisplay ?? DEFAULT_BRIDGE_ACTOR_DISPLAY,
			role: "agent_owner",
			status: "active",
		};
		if (!actor.user_key.startsWith("agt_")) return fail("SITE_UNAVAILABLE");
		const consent: ConsentEvidence = {
			accepted: true,
			acceptedAt: now.toISOString(),
			policyVersion: normalized.payload.consentPolicyVersion,
		};
		const title = `${normalized.payload.projectType} in ${normalized.payload.location}`;
		const notes = [
			normalized.payload.notes,
			normalized.payload.timeline
				? `Timeline: ${normalized.payload.timeline}`
				: undefined,
		]
			.filter((value): value is string => Boolean(value))
			.join("\n\n");
		const captured = await lead.captureForTenant(
			ctx,
			{
				title,
				source: "web_form",
				contact_name: normalized.payload.contactName,
				contact_email: normalized.payload.email,
				contact_phone: normalized.payload.phone,
				notes: notes || undefined,
			},
			actor,
			mapping.tenantId,
			siteIdentifier,
		);
		await writeEvent(ctx.db, {
			actor_user_id: actor.user_key,
			actor_display: actor.display_name,
			action: "lead.captured",
			entity_type: "lead",
			entity_key: captured.record_id,
			to_state: captured.to_state,
			reason: JSON.stringify({ consent }),
			source: "website_bridge",
			source_ref: siteIdentifier,
		});
		const response: PublicIntakeResponse = { ok: true, received: true };
		await ctx.db.insert("catalog_idempotency", {
			key: replayKey,
			contract: "publicIntake.submit",
			result: JSON.stringify({ requestHash, response, consent }),
			created_by: actor.user_key,
			created_at: now.toISOString(),
			updated_by: actor.user_key,
			updated_at: now.toISOString(),
			source: "public_intake",
			schema_version: SCHEMA_VERSION,
			company_id: lead.COMPANY_ID,
		});
		return response;
	},
});
