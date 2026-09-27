import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// TC-BUILD-1: Build Pack §22 domain model → Convex schema.
// Stack mapping (D1 → Convex), fixed per contract:
// - D1 TEXT PK `<prefix>_01J…` → `key: v.string()` + `.index("by_key", ["key"])`.
//   Convex `_id` stays system-generated; `key` is the business identity.
// - TEXT → v.string(); INTEGER cents/minutes → v.number(); NUMERIC → v.number().
// - ISO-8601 UTC TEXT timestamps → v.string(); INTEGER 0/1 → v.boolean().
// - R2 key TEXT → v.string(); JSON columns → v.any().
// - Status enums → v.union(v.literal(...)).
// - FK → v.string() holding the target row's `key` (target table in comment).
// - Provenance block on EVERY table (8 fields, §22.1 naming law).
// - `assembly_usages` has no PK prefix: `assembly_key` + `assembly_version`
//   instead of `key` (per §22.1).
const provenance = {
	created_by: v.string(), // usr_* | agt_* | system — server-resolved, never client-supplied (§23.6)
	created_at: v.string(), // ISO-8601 UTC, app-written
	updated_by: v.string(),
	updated_at: v.string(), // ISO-8601 UTC, app-written
	source: v.string(),
	source_ref: v.optional(v.string()),
	schema_version: v.number(),
	company_id: v.string(), // default "co_skys" (single-company, namespaced for later)
};

export default defineSchema({
	// Preserved verbatim — memberships.ts depends on it (TC-BUILD-1 §Scope).
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

	cmsSiteTenants: defineTable({
		...provenance,
		siteIdentifier: v.string(),
		tenantId: v.string(),
	})
		.index("by_site", ["siteIdentifier"])
		.index("by_tenant", ["tenantId"]),

	// As-built amendment TC-BUILD-4: painting pipeline source of truth.
	leads: defineTable({
		...provenance,
		key: v.string(), // lead_*
		title: v.string(),
		source: v.union(
			v.literal("web_form"),
			v.literal("phone"),
			v.literal("referral"),
			v.literal("portal"),
			v.literal("walk_in"),
			v.literal("other"),
		),
		contact_name: v.optional(v.string()),
		contact_phone: v.optional(v.string()),
		contact_email: v.optional(v.string()),
		notes: v.optional(v.string()),
		stage: v.union(
			v.literal("Prospect"),
			v.literal("Outreach Sent"),
			v.literal("Reply Received"),
			v.literal("Qualifying"),
			v.literal("Site Visit Scheduled"),
			v.literal("Scope In Progress"),
			v.literal("Proposal Sent"),
			v.literal("Bid Submitted"),
			v.literal("Awarded"),
			v.literal("Won"),
			v.literal("On Hold"),
			v.literal("Disqualified"),
			v.literal("Lost"),
		),
		client_name: v.optional(v.string()),
		client_type: v.optional(v.string()),
		qualification_notes: v.optional(v.string()),
		co_lead_id: v.optional(v.string()),
		reopened_from: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Entity 1: Opportunity ──────────────────────────────────────────────
	opportunities: defineTable({
		...provenance,
		key: v.string(), // opp_*
		channel: v.string(), // channel enum
		status: v.union(
			v.literal("intake"),
			v.literal("qualified"),
			v.literal("walking"),
			v.literal("estimating"),
			v.literal("proposed"),
			v.literal("won"),
			v.literal("lost"),
			v.literal("declined"),
		),
		bid_no_bid: v.boolean(),
		no_go_reason: v.optional(v.string()),
		account_id: v.string(), // → accounts.key
		contact_id: v.optional(v.string()), // → contacts.key (nullable)
		campaign_id: v.optional(v.string()), // → campaigns.key (nullable)
	}).index("by_key", ["key"]),

	// ── Entity 2: Account ──────────────────────────────────────────────────
	accounts: defineTable({
		...provenance,
		key: v.string(), // acct_*
		name: v.string(),
		bill_to_entity: v.string(),
		status: v.union(
			v.literal("prospect"),
			v.literal("target"),
			v.literal("on_list"),
			v.literal("approved_vendor"),
			v.literal("active"),
			v.literal("dormant"),
		),
		dossier_sections: v.optional(v.any()), // structured dossier sections on account
	}).index("by_key", ["key"]),

	account_properties: defineTable({
		...provenance,
		key: v.string(), // acct_*
		account_id: v.string(), // → accounts.key
		label: v.string(),
		address_line1: v.string(),
		address_line2: v.optional(v.string()),
		city: v.string(),
		state: v.string(),
		postal_code: v.string(),
	}).index("by_key", ["key"]),

	// ── Entity 3: Bid ──────────────────────────────────────────────────────
	bids: defineTable({
		...provenance,
		key: v.string(), // bid_*
		bid_deadline: v.string(), // ISO-8601 UTC, NOT NULL
		status: v.union(
			v.literal("watching"),
			v.literal("go_no_go"),
			v.literal("building"),
			v.literal("submitted"),
			v.literal("won"),
			v.literal("lost"),
			v.literal("declined"),
		),
		red_flags: v.any(), // red-flag checklist as structured booleans
		lead_id: v.optional(v.string()), // → leads.key
		gc_vendor_id: v.optional(v.string()), // → vendors.key
	}).index("by_key", ["key"]),

	addenda: defineTable({
		...provenance,
		key: v.string(), // bid_*
		bid_id: v.string(), // → bids.key
		addendum_no: v.number(),
		issued_at: v.string(), // ISO-8601 UTC
		description: v.string(),
		artifact_id: v.optional(v.string()), // → artifacts.key
	}).index("by_key", ["key"]),

	rfi_log: defineTable({
		...provenance,
		key: v.string(), // bid_*
		bid_id: v.string(), // → bids.key
		rfi_no: v.string(),
		question: v.string(),
		asked_by: v.string(),
		asked_at: v.string(), // ISO-8601 UTC
		answered_at: v.optional(v.string()), // ISO-8601 UTC
		answer: v.optional(v.string()),
		status: v.string(),
	}).index("by_key", ["key"]),

	bid_scope_items: defineTable({
		...provenance,
		key: v.string(), // bid_*
		bid_id: v.string(), // → bids.key
		description: v.string(),
		cost_code: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Entity 4: Estimate ──────────────────────────────────────────────────
	estimates: defineTable({
		...provenance,
		key: v.string(), // est_*
		version: v.number(), // integer
		supersedes_version_id: v.optional(v.string()), // → estimates.key
		status: v.union(
			v.literal("draft"),
			v.literal("anthony_review"),
			v.literal("approved"),
			v.literal("superseded"),
			v.literal("rework"),
			v.literal("abandoned"),
		),
		base_total_cents: v.number(), // integer cents
		alternates: v.any(), // alternates as line-groups (JSON)
		exclusions: v.any(), // exclusions list (JSON)
		markup_pct: v.number(),
		margin_pct: v.number(),
		formula_set_version: v.optional(v.string()),
		lead_id: v.optional(v.string()), // → leads.key
		bid_id: v.optional(v.string()), // → bids.key
	}).index("by_key", ["key"]),

	estimate_lines: defineTable({
		...provenance,
		key: v.string(), // estl_*
		estimate_id: v.string(), // → estimates.key
		cost_code: v.string(),
		quantity: v.number(), // NUMERIC(12,2)
		unit: v.string(),
		epistemic: v.string(),
		formula_ref: v.optional(v.string()),
		assumption_id: v.optional(v.string()), // → assumptions.key
		rate_row_id: v.optional(v.string()), // → rate_rows.key
		scope_assembly_id: v.optional(v.string()),
		extended_cost_cents: v.number(), // integer cents, engine-written
		kind: v.optional(v.string()),
		burdened_pct: v.optional(v.number()),
	}).index("by_key", ["key"]),

	// ── Entity 5: Proposal ──────────────────────────────────────────────────
	proposals: defineTable({
		...provenance,
		key: v.string(), // prop_*
		estimate_id: v.string(), // → estimates.key (snapshot ref, never "latest")
		estimate_version: v.number(), // integer
		status: v.union(
			v.literal("draft"),
			v.literal("sent"),
			v.literal("follow_up"),
			v.literal("accepted"),
			v.literal("declined"),
			v.literal("expired"),
		),
		rendered_artifact_id: v.optional(v.string()), // → artifacts.key (R2 PDF)
		job_id: v.optional(v.string()), // → jobs.key (back-pointer on acceptance)
	}).index("by_key", ["key"]),

	// ── Entity 6: Job ──────────────────────────────────────────────────────
	jobs: defineTable({
		...provenance,
		key: v.string(), // job_*
		status: v.union(
			v.literal("scheduled"),
			v.literal("in_production"),
			v.literal("punch"),
			v.literal("closeout"),
			v.literal("closed"),
		),
		contract_value_cents: v.number(), // integer cents
		sov_id: v.optional(v.string()), // schedule-of-values ref
		gc_vendor_id: v.optional(v.string()), // → vendors.key
		prevailing_wage_refs: v.optional(v.any()), // public prevailing-wage refs (JSON)
		proposal_id: v.optional(v.string()), // → proposals.key
	}).index("by_key", ["key"]),

	punch_items: defineTable({
		...provenance,
		key: v.string(), // job_*
		job_id: v.string(), // → jobs.key
		description: v.string(),
		status: v.string(),
		resolved_at: v.optional(v.string()), // ISO-8601 UTC
	}).index("by_key", ["key"]),

	// ── Entity 7: Phase ────────────────────────────────────────────────────
	job_phases: defineTable({
		...provenance,
		key: v.string(), // jph_*
		job_id: v.string(), // → jobs.key
		phase_type: v.union(
			v.literal("mobilization"),
			v.literal("prep"),
			v.literal("coats"),
			v.literal("cleanup"),
			v.literal("rework"),
			v.literal("callback"),
		),
		planned_hours_min: v.number(), // integer minutes
	}).index("by_key", ["key"]),

	// ── Entity 8: TimeEntry ────────────────────────────────────────────────
	time_entries: defineTable({
		...provenance,
		key: v.string(), // tte_*
		person_user_id: v.string(), // → users.key
		job_id: v.string(), // → jobs.key
		phase_id: v.optional(v.string()), // → job_phases.key
		work_date: v.string(), // ISO-8601 UTC date
		minutes: v.number(), // integer minutes
		burdened_rate_cents_per_hr: v.number(), // integer cents, snapshotted at write
		cost_cents: v.number(), // integer cents, snapshotted at write
		corrects_entry_id: v.optional(v.string()), // → time_entries.key (corrections are new rows)
	}).index("by_key", ["key"]),

	// ── Entity 9: MaterialReceipt ───────────────────────────────────────────
	material_receipts: defineTable({
		...provenance,
		key: v.string(), // mre_*
		job_id: v.string(), // → jobs.key
		product: v.string(),
		gallons: v.number(), // NUMERIC(12,2)
		cost_cents: v.number(), // integer cents
		receipt_artifact_id: v.string(), // → artifacts.key (REQUIRED)
		gallons_returned: v.number(), // NUMERIC(12,2)
		rework_gallons: v.number(), // NUMERIC(12,2)
	}).index("by_key", ["key"]),

	// ── Entity 10: EquipmentUsage ───────────────────────────────────────────
	equipment_usage: defineTable({
		...provenance,
		key: v.string(), // equ_*
		equipment_id: v.string(), // → equipment.key (register)
		job_id: v.string(), // → jobs.key
		days_used: v.number(), // NUMERIC(12,2)
		rate_snapshot_cents: v.number(), // integer cents
		cost_cents: v.number(), // integer cents (CALCULATION)
	}).index("by_key", ["key"]),

	equipment: defineTable({
		...provenance,
		key: v.string(), // eqp_*
		name: v.string(),
		equipment_type: v.string(),
		status: v.string(),
	}).index("by_key", ["key"]),

	// ── Entity 11: ChangeOrder ─────────────────────────────────────────────
	change_orders: defineTable({
		...provenance,
		key: v.string(), // co_*
		job_id: v.string(), // → jobs.key
		status: v.union(
			v.literal("identified"),
			v.literal("priced"),
			v.literal("approved"),
			v.literal("billed"),
			v.literal("declined"),
			v.literal("voided"),
		),
		field_ticket_artifact_id: v.optional(v.string()), // → artifacts.key
		directed_by: v.string(),
		price_cents: v.number(), // integer cents
		approved_by: v.optional(v.string()),
		approved_at: v.optional(v.string()), // ISO-8601 UTC
		approval_artifact_id: v.optional(v.string()), // → artifacts.key
	}).index("by_key", ["key"]),

	// ── Entity 12: Invoice / PayApp ─────────────────────────────────────────
	invoices: defineTable({
		...provenance,
		key: v.string(), // inv_*
		job_id: v.string(), // → jobs.key
		change_order_id: v.optional(v.string()), // → change_orders.key
		status: v.union(
			v.literal("draft"),
			v.literal("sent"),
			v.literal("partial"),
			v.literal("paid"),
			v.literal("overdue"),
			v.literal("disputed"),
		),
		amount_cents: v.number(), // integer cents
	}).index("by_key", ["key"]),

	pay_apps: defineTable({
		...provenance,
		key: v.string(), // inv_*
		job_id: v.string(), // → jobs.key
		application_no: v.number(), // integer
		contract_sum_to_date_cents: v.number(), // integer cents (CALCULATION, immutable once submitted)
		current_payment_due_cents: v.number(), // integer cents (CALCULATION, immutable once submitted)
		status: v.string(),
		submitted_at: v.optional(v.string()), // ISO-8601 UTC; snapshots immutable once submitted
	}).index("by_key", ["key"]),

	sov_lines: defineTable({
		...provenance,
		key: v.string(), // inv_*
		job_id: v.string(), // → jobs.key
		description: v.string(),
		scheduled_value_cents: v.number(), // integer cents
	}).index("by_key", ["key"]),

	pay_app_lines: defineTable({
		...provenance,
		key: v.string(), // inv_*
		pay_app_id: v.string(), // → pay_apps.key
		sov_line_id: v.string(), // → sov_lines.key
		amount_cents: v.number(), // integer cents
	}).index("by_key", ["key"]),

	// ── Entity 13: CollectionLedger ─────────────────────────────────────────
	money_events: defineTable({
		...provenance,
		key: v.string(), // mev_*
		job_id: v.string(), // → jobs.key
		kind: v.union(
			v.literal("billed"),
			v.literal("payment_received"),
			v.literal("retainage_withheld"),
			v.literal("retainage_released"),
			v.literal("write_off"),
			v.literal("adjustment"),
		),
		amount_cents: v.number(), // integer cents
		decision_id: v.optional(v.string()), // → decisions.key (REQUIRED when kind is write_off)
	}).index("by_key", ["key"]),

	retainage_releases: defineTable({
		...provenance,
		key: v.string(), // mev_*
		job_id: v.string(), // → jobs.key
		money_event_id: v.optional(v.string()), // → money_events.key (child)
		amount_cents: v.number(), // integer cents
		released_at: v.optional(v.string()), // ISO-8601 UTC
	}).index("by_key", ["key"]),

	lien_deadlines: defineTable({
		...provenance,
		key: v.string(), // mev_*
		job_id: v.string(), // → jobs.key (child of money_events per ERD)
		deadline_date: v.string(), // ISO-8601 UTC date
		description: v.string(),
		status: v.string(),
	}).index("by_key", ["key"]),

	// ── Entity 14: CloseoutKit ─────────────────────────────────────────────
	closeout_kits: defineTable({
		...provenance,
		key: v.string(), // ck_*
		job_id: v.string(), // → jobs.key (1:1)
		status: v.union(v.literal("open"), v.literal("complete")),
		warranty_complete: v.boolean(),
		paint_schedule_complete: v.boolean(),
		attic_stock_complete: v.boolean(),
		final_waiver_complete: v.boolean(),
		variance_report_complete: v.boolean(),
		warranty_artifact_id: v.optional(v.string()), // → artifacts.key
		paint_schedule_artifact_id: v.optional(v.string()), // → artifacts.key
		final_waiver_artifact_id: v.optional(v.string()), // → artifacts.key
	}).index("by_key", ["key"]),

	// ── Entity 15: RateTable ────────────────────────────────────────────────
	rate_sets: defineTable({
		...provenance,
		key: v.string(), // rs_*
		name: v.string(),
		version: v.number(), // integer
		status: v.string(),
	}).index("by_key", ["key"]),

	rate_rows: defineTable({
		...provenance,
		key: v.string(), // rr_*
		rate_set_id: v.string(), // → rate_sets.key
		cost_code: v.string(),
		description: v.string(),
		rate_cents: v.number(), // integer cents
		unit: v.string(),
	}).index("by_key", ["key"]),

	// ── Entity 16: ScopeAssembly link ───────────────────────────────────────
	// No PK prefix per §22.1: stable assembly_key + assembly_version TEXT.
	assembly_usages: defineTable({
		...provenance,
		assembly_key: v.string(),
		assembly_version: v.string(),
		estimate_line_id: v.optional(v.string()), // → estimate_lines.key
	}).index("by_assembly", ["assembly_key", "assembly_version"]),

	// ── Entity 17: Contact ─────────────────────────────────────────────────
	contacts: defineTable({
		...provenance,
		key: v.string(), // ctc_*
		account_id: v.string(), // → accounts.key
		name: v.string(),
		role: v.string(), // role enum
		email: v.optional(v.string()),
		phone: v.optional(v.string()),
		authority_notes: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Entity 18: Vendor / Prequal ─────────────────────────────────────────
	vendors: defineTable({
		...provenance,
		key: v.string(), // ven_*
		name: v.string(),
		status: v.union(
			v.literal("not_started"),
			v.literal("packet_sent"),
			v.literal("under_review"),
			v.literal("accepted"),
			v.literal("rejected"),
			v.literal("renewal_due"),
		),
	}).index("by_key", ["key"]),

	prequal_records: defineTable({
		...provenance,
		key: v.string(), // pq_*
		vendor_id: v.string(), // → vendors.key
		status: v.string(),
		packet_artifact_id: v.optional(v.string()), // → artifacts.key
		reviewed_at: v.optional(v.string()), // ISO-8601 UTC
	}).index("by_key", ["key"]),

	// ── Entity 19: Campaign / Touch ─────────────────────────────────────────
	campaigns: defineTable({
		...provenance,
		key: v.string(), // cam_*
		name: v.string(),
		status: v.string(),
		next_action: v.string(), // required
		next_action_date: v.string(), // ISO-8601 UTC, required
	}).index("by_key", ["key"]),

	touches: defineTable({
		...provenance,
		key: v.string(), // tch_*
		campaign_id: v.optional(v.string()), // → campaigns.key
		contact_id: v.optional(v.string()), // → contacts.key
		account_id: v.optional(v.string()), // → accounts.key
		disposition: v.string(), // disposition enum
		next_action: v.string(), // required
		next_action_date: v.string(), // ISO-8601 UTC, required
		// OS records; sending stays in Johnny's Gmail (V1)
	}).index("by_key", ["key"]),

	// ── Entity 20: Dossier ─────────────────────────────────────────────────
	dossiers: defineTable({
		...provenance,
		key: v.string(), // dos_*
		account_id: v.string(), // → accounts.key (1:1)
	}).index("by_key", ["key"]),

	dossier_entries: defineTable({
		...provenance,
		key: v.string(), // dos_*
		dossier_id: v.string(), // → dossiers.key
		observed_at: v.string(), // ISO-8601 UTC (dated observations)
		observation: v.string(),
	}).index("by_key", ["key"]),

	maintenance_outlooks: defineTable({
		...provenance,
		key: v.string(), // dos_*
		account_id: v.string(), // → accounts.key
		outlook_date: v.string(), // ISO-8601 UTC date (outlook one-pagers)
		summary: v.string(),
		artifact_id: v.optional(v.string()), // → artifacts.key
	}).index("by_key", ["key"]),

	// ── Cross-cutting: users ────────────────────────────────────────────────
	users: defineTable({
		...provenance,
		key: v.string(), // usr_* (canonical business identity: usr_anthony, usr_johnny)
		display_name: v.string(),
		role: v.union(
			v.literal("owner"),
			v.literal("principal"),
			v.literal("crew"),
			v.literal("viewer"),
			v.literal("agent_owner"),
		),
		status: v.string(),
		// auth_provider/auth_subject is a read-through cache of the active
		// binding (§22.7), not a second truth.
		auth_provider: v.optional(v.string()),
		auth_subject: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Cross-cutting: identity_bindings (§22.5, Phase 4 F-01 canonical) ─────
	identity_bindings: defineTable({
		...provenance,
		key: v.string(), // bind_*
		user_id: v.string(), // → users.key (NOT NULL)
		provider: v.string(), // chatgpt_sites | supabase_auth
		provider_subject: v.string(), // opaque; never shown in UI, never logged raw
		status: v.union(
			v.literal("active"),
			v.literal("superseded"),
			v.literal("revoked"),
		),
		bound_at: v.string(), // ISO-8601 UTC
		superseded_at: v.optional(v.string()), // ISO-8601 UTC
		revoked_at: v.optional(v.string()), // ISO-8601 UTC
		revoked_reason: v.optional(v.string()),
	})
		.index("by_key", ["key"])
		.index("by_provider_subject", ["provider", "provider_subject"]) // UNIQUE(provider, provider_subject)
		.index("by_user_provider", ["user_id", "provider"]), // one active binding per provider per user (partial WHERE active, app-enforced)

	// ── Cross-cutting: assumptions ─────────────────────────────────────────
	assumptions: defineTable({
		...provenance,
		key: v.string(), // asm_*
		owner_entity: v.string(), // polymorphic owner
		statement: v.string(),
		owner_user_id: v.optional(v.string()), // → users.key
		status: v.union(
			v.literal("open"),
			v.literal("owned"),
			v.literal("retired"),
			v.literal("superseded"),
		),
		superseded_by_id: v.optional(v.string()), // → assumptions.key
		evidence_ref: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Cross-cutting: decisions ───────────────────────────────────────────
	decisions: defineTable({
		...provenance,
		key: v.string(), // dec_*
		subject_entity: v.string(), // polymorphic subject
		decision_text: v.string(),
		decided_by: v.string(), // server-resolved per §23.6
		decided_at: v.string(), // ISO-8601 UTC
		basis_ref: v.optional(v.string()),
		artifact_hash: v.optional(v.string()), // §45 approval record
	}).index("by_key", ["key"]),

	// ── Cross-cutting: evidence_items ───────────────────────────────────────
	evidence_items: defineTable({
		...provenance,
		key: v.string(), // evi_*
		artifact_id: v.string(), // → artifacts.key
		description: v.string(),
		linked_entity: v.string(), // polymorphic linked entity
		captured_by: v.string(),
		captured_at: v.string(), // ISO-8601 UTC
	}).index("by_key", ["key"]),

	// ── Cross-cutting: artifacts ───────────────────────────────────────────
	artifacts: defineTable({
		...provenance,
		key: v.string(), // art_*
		r2_key: v.string(), // {owner_type}/{owner_id}/{purpose}/{artifact_id}.{ext}
		sha256: v.string(),
		mime: v.string(),
		bytes: v.number(),
		owner_type: v.string(), // allowlist
		owner_id: v.string(),
		purpose: v.string(), // purpose enum
		captured_by: v.string(),
		captured_at: v.string(), // ISO-8601 UTC
	}).index("by_key", ["key"]),

	// ── Cross-cutting: event_log (§23.1 — the audit record) ──────────────────
	event_log: defineTable({
		...provenance,
		key: v.string(), // evt_*
		at: v.string(), // When: ISO-8601 UTC, app-written (NOT NULL)
		actor_user_id: v.string(), // Who: usr_* | agt_* | system (session-resolved, §23.6)
		actor_display: v.string(), // human-readable at write time (denormalized)
		auth_provider: v.optional(v.string()), // which provider authenticated this session
		action: v.string(), // What: transition name or business action (NOT NULL)
		entity_type: v.optional(v.string()), // Which record (type)
		entity_id: v.string(), // Which record (id) (NOT NULL)
		entity_version: v.optional(v.number()), // Which version (integer)
		from_state: v.optional(v.string()), // the transition, if any
		to_state: v.optional(v.string()), // the transition, if any
		decision_id: v.optional(v.string()), // → decisions.key, when the event IS an approval
		jev_decision_id: v.optional(v.string()), // → jev_decisions.key, when the event consumed Jev advice
		evidence_artifact_ids: v.optional(v.string()), // Which evidence: JSON array of artifact_id (TEXT)
		evidence_hash: v.optional(v.string()), // sha256 of the approved bytes/version snapshot
		reason: v.optional(v.string()), // required on terminal/abandoning transitions
		// source / source_ref come from the provenance block (NOT NULL / NULL).
		prev_hash: v.string(), // hash chain link (NOT NULL)
		event_hash: v.string(), // sha256 of this row's canonical form, §23.4 (NOT NULL)
		// schema_version / company_id come from the provenance block.
	})
		.index("by_key", ["key"])
		.index("by_entity", ["entity_type", "entity_id"]),

	// ── As-built amendment TC-BUILD-3: catalog dispatch idempotency ─────────
	catalog_idempotency: defineTable({
		key: v.string(),
		contract: v.string(),
		result: v.string(),
		...provenance,
	}).index("by_key", ["key"]),

	// ── Cross-cutting: agents ──────────────────────────────────────────────
	agents: defineTable({
		...provenance,
		key: v.string(), // agt_* (agent identities; never users)
		display_name: v.string(),
		scopes: v.any(), // scope list (JSON)
		status: v.string(),
	}).index("by_key", ["key"]),

	// ── Cross-cutting: jev_decisions (§22.6) ─────────────────────────────────
	jev_decisions: defineTable({
		...provenance,
		key: v.string(), // jev_*
		ts: v.string(), // ISO-8601 UTC (NOT NULL)
		model: v.optional(v.string()), // e.g. typesafe-ai/jev
		caller: v.optional(v.string()), // agent class or service:<decision-point-id>
		insertion_point: v.optional(v.string()), // catalog id (bid_no_bid, estimate_confidence, …)
		state: v.any(), // JSON
		questions: v.any(), // JSON
		answers: v.any(), // JSON
		usage: v.optional(v.string()), // cost/latency telemetry (§G.2)
		latency_ms: v.optional(v.number()), // integer
		prev_hash: v.optional(v.string()), // hash chain (sha256 over canonical JSON + prev_hash)
		record_hash: v.optional(v.string()),
		outcome_kind: v.optional(v.string()), // filled by deterministic outcome recorders, never the judging agent
		outcome_observed_at: v.optional(v.string()), // ISO-8601 UTC
		outcome_value: v.optional(v.any()),
		calibration_note: v.optional(v.string()),
	}).index("by_key", ["key"]),

	// ── Mechanical: outbox_receipts (idempotency ledger) ─────────────────────
	outbox_receipts: defineTable({
		...provenance,
		key: v.string(),
		client_event_id: v.string(),
		received_at: v.string(), // ISO-8601 UTC
		applied_table: v.string(),
		applied_id: v.string(),
		result: v.string(), // field retries never double-apply
	})
		.index("by_key", ["key"])
		.index("by_client_event", ["client_event_id"]),

	// ── Mechanical: export_runs (canonical export job ledger) ────────────────
	export_runs: defineTable({
		...provenance,
		key: v.string(),
		run_id: v.string(),
		started_at: v.string(), // ISO-8601 UTC
		completed_at: v.optional(v.string()), // ISO-8601 UTC
		export_schema_version: v.number(),
		table_counts: v.any(), // per-table counts (JSON)
		table_hashes: v.any(), // per-table hashes (JSON)
		artifact_manifest_hash: v.optional(v.string()),
		status: v.string(),
	})
		.index("by_key", ["key"])
		.index("by_run", ["run_id"]),
});
