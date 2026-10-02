import { api, components } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import type { ResolvedUser } from "./identity";

export const COMPANY_ID = "co_skys";
const SCHEMA_VERSION = 1;
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type LeadStage = Doc<"leads">["stage"];
export type ServiceResult = {
	record_id: string;
	status: string;
	from_state?: string;
	to_state?: string;
	reason?: string;
	entity_refs?: string[];
	event_action?: string;
	facts?: Record<string, unknown>;
};

export class LeadServiceError extends Error {
	constructor(
		public readonly code:
			| "NOT_FOUND"
			| "FORBIDDEN"
			| "GUARD_STAGE"
			| "GUARD_BLOCKED",
		message: string,
	) {
		super(message);
	}
}

function newUlid(): string {
	let timestamp = Date.now();
	let encodedTime = "";
	for (let index = 0; index < 10; index += 1) {
		encodedTime = ULID_ALPHABET[timestamp % 32] + encodedTime;
		timestamp = Math.floor(timestamp / 32);
	}
	let randomness = "";
	for (let index = 0; index < 16; index += 1) {
		randomness += ULID_ALPHABET[Math.floor(Math.random() * 32)];
	}
	return `${encodedTime}${randomness}`;
}

async function requireTenant(ctx: MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new LeadServiceError("FORBIDDEN", "UNAUTHENTICATED");
	const membership = await ctx.db
		.query("contractorOsMemberships")
		.withIndex("by_identity", (q) =>
			q.eq("tokenIdentifier", identity.tokenIdentifier),
		)
		.unique();
	if (!membership?.enabled)
		throw new LeadServiceError("FORBIDDEN", "FORBIDDEN");
	return { tenantId: membership.tenantId, actorId: identity.tokenIdentifier };
}

async function findLead(ctx: MutationCtx, leadId: string) {
	const { tenantId } = await requireTenant(ctx);
	// Both lookup paths are scoped before reading a row. Legacy tenantless
	// records cannot be attributed safely and deliberately remain inaccessible.
	let record = await ctx.db
		.query("leads")
		.withIndex("by_tenant_key", (q) =>
			q.eq("tenantId", tenantId).eq("key", leadId),
		)
		.unique();
	if (!record) {
		record = await ctx.db
			.query("leads")
			.withIndex("by_tenant_co_lead_id", (q) =>
				q.eq("tenantId", tenantId).eq("co_lead_id", leadId),
			)
			.unique();
	}
	if (!record)
		throw new LeadServiceError("NOT_FOUND", `Lead ${leadId} not found`);
	return record;
}

function guard(
	record: Doc<"leads">,
	allowed: readonly LeadStage[],
	to: LeadStage,
) {
	if (!allowed.includes(record.stage)) {
		throw new LeadServiceError(
			"GUARD_STAGE",
			`GUARD_STAGE from=${record.stage} to=${to}`,
		);
	}
}

async function patchStage(
	ctx: MutationCtx,
	record: Doc<"leads">,
	actor: ResolvedUser,
	to: LeadStage,
	extra: Partial<Doc<"leads">> = {},
) {
	await ctx.db.patch(record._id, {
		stage: to,
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
		...extra,
	});
}

function result(
	record: Doc<"leads">,
	to: LeadStage,
	entityRefs: string[] = [],
	reason?: string,
): ServiceResult {
	return {
		record_id: record.key,
		status: to,
		from_state: record.stage,
		to_state: to,
		...(reason ? { reason } : {}),
		...(entityRefs.length ? { entity_refs: entityRefs } : {}),
	};
}

export type CapturePayload = {
	title: string;
	source: Doc<"leads">["source"];
	contact_name?: string;
	contact_phone?: string;
	contact_email?: string;
	notes?: string;
};

export async function captureForTenant(
	ctx: MutationCtx,
	payload: CapturePayload,
	actor: ResolvedUser,
	tenantId: string,
	sourceRef?: string,
): Promise<ServiceResult> {
	const now = new Date().toISOString();
	const key = `lead_${newUlid()}`;
	await ctx.db.insert("leads", {
		key,
		tenantId,
		...payload,
		stage: "Prospect",
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source_ref: sourceRef,
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	});
	return { record_id: key, status: "Prospect", to_state: "Prospect" };
}

export async function capture(
	ctx: MutationCtx,
	payload: CapturePayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const { tenantId } = await requireTenant(ctx);
	return captureForTenant(ctx, payload, actor, tenantId);
}

type LeadPayload = { lead_id: string };

export async function sendOutreach(
	ctx: MutationCtx,
	payload: LeadPayload & { channel: string; message_ref?: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Prospect"], "Outreach Sent");
	await patchStage(ctx, record, actor, "Outreach Sent");
	return result(record, "Outreach Sent");
}

export async function recordReply(
	ctx: MutationCtx,
	payload: LeadPayload & { reply_summary: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Outreach Sent"], "Reply Received");
	await patchStage(ctx, record, actor, "Reply Received");
	return result(record, "Reply Received");
}

export async function qualify(
	ctx: MutationCtx,
	payload: LeadPayload & {
		client_name: string;
		client_type?: string;
		qualification_notes?: string;
	},
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Reply Received"], "Qualifying");
	let coLeadId: string;
	let revision: number;
	if (record.reopened_from && record.co_lead_id === record.key) {
		// Reopened leads already have a component projection. Attach the client
		// to that identity before advancing it, instead of creating a second lead.
		const scope = await requireTenant(ctx);
		const client = await ctx.runQuery(
			components.contractorOs.records.co_client.get,
			{ tenantId: scope.tenantId, identifier: payload.client_name },
		);
		const componentLead = await ctx.runQuery(
			components.contractorOs.records.co_lead.get,
			{ tenantId: scope.tenantId, identifier: record.key },
		);
		if (!client || !componentLead || componentLead.properties.stage !== "new")
			throw new LeadServiceError(
				"NOT_FOUND",
				"Reopened lead or client missing",
			);
		const linked = await ctx.runMutation(
			components.contractorOs.records.co_lead.update,
			{
				tenantId: scope.tenantId,
				actorId: scope.actorId,
				requestKey: newUlid(),
				identifier: record.key,
				expectedRevision: componentLead.revision,
				properties: payload.qualification_notes
					? { description: payload.qualification_notes }
					: {},
				relations: { client: client._id },
			},
		);
		coLeadId = record.key;
		revision = linked.revision;
	} else {
		const created = await ctx.runMutation(api.backend.co_create_lead, {
			requestKey: newUlid(),
			input: {
				stage: "new",
				title: record.title,
				client: payload.client_name,
				description: payload.qualification_notes,
			},
		});
		coLeadId = created.primary.identifier;
		revision = created.primary.revision;
	}
	await ctx.runMutation(api.backend.co_advance_lead, {
		requestKey: newUlid(),
		input: { lead: coLeadId, new_stage: "qualifying" },
		expected: [
			{
				blueprint: "co_lead",
				identifier: coLeadId,
				revision,
			},
		],
	});
	await patchStage(ctx, record, actor, "Qualifying", {
		client_name: payload.client_name,
		client_type: payload.client_type,
		qualification_notes: payload.qualification_notes,
		co_lead_id: coLeadId,
	});
	return result(record, "Qualifying", [coLeadId]);
}

export async function scheduleSiteVisit(
	ctx: MutationCtx,
	payload: LeadPayload & {
		scheduled_at: string;
		address?: string;
		notes?: string;
	},
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Qualifying"], "Site Visit Scheduled");
	if (!record.co_lead_id)
		throw new LeadServiceError("NOT_FOUND", "Component lead missing");
	const created = await ctx.runMutation(api.backend.co_schedule_site_visit, {
		requestKey: newUlid(),
		input: {
			lead: record.co_lead_id,
			visit_date: payload.scheduled_at,
			address: payload.address,
			notes: payload.notes,
		},
		expected: [await componentExpected(ctx, "co_lead", record.co_lead_id)],
	});
	await patchStage(ctx, record, actor, "Site Visit Scheduled");
	return result(record, "Site Visit Scheduled", [
		record.co_lead_id,
		created.primary.identifier,
	]);
}

export async function startScope(
	ctx: MutationCtx,
	payload: LeadPayload & { scope_notes?: string; trade_spec_refs?: string[] },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Site Visit Scheduled"], "Scope In Progress");
	if (!record.co_lead_id)
		throw new LeadServiceError("NOT_FOUND", "Component lead missing");
	const created = await ctx.runMutation(api.backend.co_create_scope, {
		requestKey: newUlid(),
		input: {
			lead: record.co_lead_id,
			version: "1",
			description: payload.scope_notes,
		},
		expected: [await componentExpected(ctx, "co_lead", record.co_lead_id)],
	});
	await patchStage(ctx, record, actor, "Scope In Progress");
	return result(record, "Scope In Progress", [
		record.co_lead_id,
		created.primary.identifier,
	]);
}

export async function sendProposal(
	ctx: MutationCtx,
	payload: LeadPayload & {
		amount_cents: number;
		estimate_version_id: string;
		proposal_doc_ref?: string;
	},
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Scope In Progress"], "Proposal Sent");
	const estimate = await ctx.db
		.query("estimates")
		.withIndex("by_key", (query) =>
			query.eq("key", payload.estimate_version_id),
		)
		.unique();
	if (!estimate || estimate.lead_id !== record.key) {
		throw new LeadServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED estimate version must belong to lead",
		);
	}
	if (estimate.status !== "approved") {
		throw new LeadServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED estimate version must be approved",
		);
	}
	if (estimate.base_total_cents !== payload.amount_cents) {
		throw new LeadServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED proposal amount must equal engine-computed total",
		);
	}
	if (!record.co_lead_id || !record.client_name)
		throw new LeadServiceError("NOT_FOUND", "Component lead or client missing");
	const scope = `scope-${record.co_lead_id}-v1`;
	await ctx.runMutation(api.backend.transition, {
		requestKey: newUlid(),
		input: { blueprint: "co_scope", identifier: scope, to: "in_review" },
		expected: [await componentExpected(ctx, "co_scope", scope)],
	});
	await ctx.runMutation(api.backend.transition, {
		requestKey: newUlid(),
		input: { blueprint: "co_scope", identifier: scope, to: "approved" },
		expected: [await componentExpected(ctx, "co_scope", scope)],
		evidence: {
			kind: "scope_approved",
			reference: newUlid(),
			occurredAt: new Date().toISOString(),
		},
	});
	const created = await ctx.runMutation(api.backend.co_create_proposal, {
		requestKey: newUlid(),
		input: {
			lead: record.co_lead_id,
			scope,
			amount: payload.amount_cents,
			client: record.client_name,
			version: "1",
		},
	});
	const now = new Date().toISOString();
	await ctx.db.insert("proposals", {
		key: created.primary.identifier,
		estimate_id: estimate.key,
		estimate_version: estimate.version,
		status: "sent",
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source: "catalog.dispatch",
		source_ref: payload.proposal_doc_ref,
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	});
	await patchStage(ctx, record, actor, "Proposal Sent");
	return result(record, "Proposal Sent", [
		record.co_lead_id,
		scope,
		created.primary.identifier,
		estimate.key,
	]);
}

export async function submitBid(
	ctx: MutationCtx,
	payload: LeadPayload & { bid_amount_cents: number },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Proposal Sent"], "Bid Submitted");
	if (!record.co_lead_id || !record.client_name)
		throw new LeadServiceError("NOT_FOUND", "Component lead or client missing");
	const proposal = `proposal-${record.co_lead_id}-v1`;
	await ctx.runMutation(api.backend.transition, {
		requestKey: newUlid(),
		input: { blueprint: "co_proposal", identifier: proposal, to: "in_review" },
		expected: [await componentExpected(ctx, "co_proposal", proposal)],
	});
	await ctx.runMutation(api.backend.transition, {
		requestKey: newUlid(),
		input: { blueprint: "co_proposal", identifier: proposal, to: "sent" },
		expected: [
			await componentExpected(ctx, "co_proposal", proposal),
			await componentExpected(ctx, "co_lead", record.co_lead_id),
		],
		evidence: {
			kind: "proposal_sent",
			reference: newUlid(),
			occurredAt: new Date().toISOString(),
		},
	});
	const created = await ctx.runMutation(api.backend.co_submit_bid, {
		requestKey: newUlid(),
		input: {
			lead: record.co_lead_id,
			amount: payload.bid_amount_cents,
			client: record.client_name,
			bid_type: "invited",
			proposal,
			bid_number: record.key,
		},
		expected: [await componentExpected(ctx, "co_lead", record.co_lead_id)],
		evidence: {
			kind: "bid_submitted",
			reference: newUlid(),
			occurredAt: new Date().toISOString(),
		},
	});
	await patchStage(ctx, record, actor, "Bid Submitted");
	return result(record, "Bid Submitted", [
		record.co_lead_id,
		proposal,
		created.primary.identifier,
	]);
}

export async function award(
	ctx: MutationCtx,
	payload: LeadPayload & { awarded_at?: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Proposal Sent", "Bid Submitted"], "Awarded");
	await patchStage(ctx, record, actor, "Awarded");
	return result(record, "Awarded");
}

export async function win(
	ctx: MutationCtx,
	payload: LeadPayload & { contract_ref?: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["Proposal Sent", "Awarded"], "Won");
	if (!record.co_lead_id || !record.client_name)
		throw new LeadServiceError("NOT_FOUND", "Component lead or client missing");
	const bid = `bid-${record.key}`;
	const created = await ctx.runMutation(
		api.backend.co_convert_bid_to_contract,
		{
			requestKey: newUlid(),
			input: {
				bid,
				client: record.client_name,
				contract_type: "lump_sum",
				retainage_percent: 0,
			},
			expected: [
				await componentExpected(ctx, "co_bid", bid),
				await componentExpected(ctx, "co_lead", record.co_lead_id),
			],
			evidence: {
				kind: "bid_awarded",
				reference: newUlid(),
				occurredAt: new Date().toISOString(),
			},
		},
	);
	const refs = [record.co_lead_id, bid, created.primary.identifier];
	if (payload.contract_ref) {
		await ctx.runMutation(api.backend.co_mark_contract_signed, {
			requestKey: newUlid(),
			input: {
				contract: created.primary.identifier,
				contract_doc_url: payload.contract_ref,
			},
			expected: [
				await componentExpected(ctx, "co_contract", created.primary.identifier),
			],
			evidence: {
				kind: "contract_signed",
				reference: newUlid(),
				occurredAt: new Date().toISOString(),
			},
		});
	}
	await patchStage(ctx, record, actor, "Won");
	return result(record, "Won", refs);
}

async function componentAdvance(
	ctx: MutationCtx,
	record: Doc<"leads">,
	to: "qualifying" | "on_hold" | "lost",
	reason?: string,
) {
	if (!record.co_lead_id) return [];
	await ctx.runMutation(api.backend.co_advance_lead, {
		requestKey: newUlid(),
		input: { lead: record.co_lead_id, new_stage: to, followup_notes: reason },
		expected: [await componentExpected(ctx, "co_lead", record.co_lead_id)],
	});
	return [record.co_lead_id];
}

async function componentExpected(
	ctx: MutationCtx,
	blueprint: "co_lead" | "co_scope" | "co_proposal" | "co_bid" | "co_contract",
	identifier: string,
) {
	const record = await ctx.runQuery(api.backend.inspectRecord, {
		blueprint,
		identifier,
	});
	if (!record) {
		throw new Error(
			`componentExpected: no ${blueprint} record for identifier ${identifier}`,
		);
	}
	return { blueprint, identifier, revision: record.revision };
}

export async function hold(
	ctx: MutationCtx,
	payload: LeadPayload & { reason: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(
		record,
		[
			"Qualifying",
			"Site Visit Scheduled",
			"Scope In Progress",
			"Proposal Sent",
			"Bid Submitted",
			"Awarded",
		],
		"On Hold",
	);
	const refs = await componentAdvance(ctx, record, "on_hold");
	await patchStage(ctx, record, actor, "On Hold");
	return result(record, "On Hold", refs, payload.reason);
}

export async function resume(
	ctx: MutationCtx,
	payload: LeadPayload,
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(record, ["On Hold"], "Qualifying");
	const refs = await componentAdvance(ctx, record, "qualifying");
	await patchStage(ctx, record, actor, "Qualifying");
	return result(record, "Qualifying", refs);
}

export async function disqualify(
	ctx: MutationCtx,
	payload: LeadPayload & { reason: string; reason_text?: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(
		record,
		["Prospect", "Outreach Sent", "Reply Received", "Qualifying"],
		"Disqualified",
	);
	await patchStage(ctx, record, actor, "Disqualified");
	return result(
		record,
		"Disqualified",
		[],
		payload.reason_text ?? payload.reason,
	);
}

export async function lose(
	ctx: MutationCtx,
	payload: LeadPayload & { reason: string; reason_text?: string },
	actor: ResolvedUser,
) {
	const record = await findLead(ctx, payload.lead_id);
	guard(
		record,
		[
			"Outreach Sent",
			"Reply Received",
			"Qualifying",
			"Site Visit Scheduled",
			"Scope In Progress",
			"Proposal Sent",
			"Bid Submitted",
			"Awarded",
			"On Hold",
		],
		"Lost",
	);
	const refs = await componentAdvance(
		ctx,
		record,
		"lost",
		payload.reason_text ?? payload.reason,
	);
	await patchStage(ctx, record, actor, "Lost");
	return result(record, "Lost", refs, payload.reason_text ?? payload.reason);
}

export async function reopen(
	ctx: MutationCtx,
	payload: LeadPayload & { reason: string },
	actor: ResolvedUser,
) {
	const source = await findLead(ctx, payload.lead_id);
	guard(source, ["Lost", "Disqualified"], "Prospect");
	const scope = await requireTenant(ctx);
	if (!source.tenantId || source.tenantId !== scope.tenantId)
		throw new LeadServiceError("NOT_FOUND", "Lead not found");
	const now = new Date().toISOString();
	const key = `lead_${newUlid()}`;
	const localId = await ctx.db.insert("leads", {
		key,
		tenantId: scope.tenantId,
		co_lead_id: key,
		title: source.title,
		source: source.source,
		contact_name: source.contact_name,
		contact_phone: source.contact_phone,
		contact_email: source.contact_email,
		notes: source.notes,
		stage: "Prospect",
		reopened_from: source.key,
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source_ref: source.key,
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	});
	// Write through to the tenant-scoped component read model. The component
	// identifier equals the new local key, so listLeads exposes one identity.
	// A component failure rolls back its own writes; remove the local row
	// before catalog records the blocked attempt.
	try {
		await ctx.runMutation(components.contractorOs.records.co_lead.create, {
			tenantId: scope.tenantId,
			actorId: scope.actorId,
			requestKey: `reopen-${key}`,
			identifier: key,
			title: source.title,
			properties: { stage: "new" },
		});
	} catch (error) {
		await ctx.db.delete(localId);
		throw error;
	}
	return {
		record_id: key,
		status: "Prospect",
		from_state: source.stage,
		to_state: "Prospect",
		reason: payload.reason,
		entity_refs: [source.key],
	};
}
