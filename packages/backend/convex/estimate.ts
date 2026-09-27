import type { Doc } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { calculate, type EstimateInput } from "./estimate_engine";
import type { ResolvedUser } from "./identity";
import { COMPANY_ID, type ServiceResult } from "./lead";

const SCHEMA_VERSION = 1;
const FORMULA_SET_VERSION = "estimate-formula-v1";

export class EstimateServiceError extends Error {
	constructor(
		public readonly code: "NOT_FOUND" | "GUARD_BLOCKED",
		message: string,
	) {
		super(message);
	}
}

function key(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function provenance(actor: ResolvedUser, now: string) {
	return {
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source: "catalog.dispatch",
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	};
}

async function byKey(
	ctx: MutationCtx,
	table: "leads",
	businessKey: string,
): Promise<Doc<"leads"> | null>;
async function byKey(
	ctx: MutationCtx,
	table: "estimates",
	businessKey: string,
): Promise<Doc<"estimates"> | null>;
async function byKey(
	ctx: MutationCtx,
	table: "rate_sets",
	businessKey: string,
): Promise<Doc<"rate_sets"> | null>;
async function byKey(
	ctx: MutationCtx,
	table: "leads" | "estimates" | "rate_sets",
	businessKey: string,
): Promise<Doc<"leads"> | Doc<"estimates"> | Doc<"rate_sets"> | null> {
	switch (table) {
		case "leads":
			return ctx.db
				.query("leads")
				.withIndex("by_key", (query) => query.eq("key", businessKey))
				.unique();
		case "estimates":
			return ctx.db
				.query("estimates")
				.withIndex("by_key", (query) => query.eq("key", businessKey))
				.unique();
		case "rate_sets":
			return ctx.db
				.query("rate_sets")
				.withIndex("by_key", (query) => query.eq("key", businessKey))
				.unique();
	}
}

export type EstimateLinePayload = {
	rate_row_ref?: string;
	kind: string;
	label: string;
	quantity: number;
	unit: string;
	notes?: string;
	burdened_pct?: number;
	epistemic?: string;
};

export type CreateEstimatePayload = {
	lead_id: string;
	rate_set_version: string;
	lines: EstimateLinePayload[];
	assumptions: { text: string; owner?: string }[];
};

async function calculateLines(
	ctx: MutationCtx,
	lines: EstimateLinePayload[],
	rateSetKey: string,
) {
	const rateSet = await byKey(ctx, "rate_sets", rateSetKey);
	if (rateSet?.status !== "approved") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED rate_set_version must exist and be approved",
		);
	}
	const rateRows = await ctx.db
		.query("rate_rows")
		.filter((query) => query.eq(query.field("rate_set_id"), rateSetKey))
		.collect();
	const inputs: EstimateInput[] = lines.map((line) => {
		const rate = rateRows.find((row) => row.key === line.rate_row_ref);
		if (!rate) {
			throw new EstimateServiceError(
				"GUARD_BLOCKED",
				`GUARD_BLOCKED missing rate row ${line.rate_row_ref ?? "(unset)"}`,
			);
		}
		if (rate.unit !== line.unit) {
			throw new EstimateServiceError(
				"GUARD_BLOCKED",
				`GUARD_BLOCKED unit mismatch for ${rate.key}`,
			);
		}
		return {
			...line,
			rate_row_ref: rate.key,
			rate_cents: rate.rate_cents,
			epistemic: line.epistemic ?? "agent_draft",
		};
	});
	return calculate(inputs, rateSetKey, FORMULA_SET_VERSION);
}

async function insertVersion(
	ctx: MutationCtx,
	payload: CreateEstimatePayload,
	actor: ResolvedUser,
	version: number,
	supersedes?: string,
) {
	const calculation = await calculateLines(
		ctx,
		payload.lines,
		payload.rate_set_version,
	);
	const now = new Date().toISOString();
	const estimateKey = key("est");
	await ctx.db.insert("estimates", {
		key: estimateKey,
		version,
		...(supersedes ? { supersedes_version_id: supersedes } : {}),
		status: "draft",
		base_total_cents: calculation.base_total_cents,
		alternates: [],
		exclusions: [],
		markup_pct: calculation.markup_pct,
		margin_pct: calculation.margin_pct,
		lead_id: payload.lead_id,
		formula_set_version: FORMULA_SET_VERSION,
		...provenance(actor, now),
		source_ref: payload.rate_set_version,
	});
	for (const calculationLine of calculation.lines) {
		await ctx.db.insert("estimate_lines", {
			key: key("estl"),
			estimate_id: estimateKey,
			cost_code: calculationLine.label,
			quantity: calculationLine.quantity,
			unit: calculationLine.unit,
			epistemic: calculationLine.epistemic,
			formula_ref: calculationLine.calculation_id,
			rate_row_id: calculationLine.rate_row_ref,
			extended_cost_cents: calculationLine.extended_cost_cents,
			kind: calculationLine.kind,
			burdened_pct: calculationLine.burdened_pct,
			...provenance(actor, now),
			source_ref: calculationLine.notes,
		});
	}
	for (const assumption of payload.assumptions) {
		await ctx.db.insert("assumptions", {
			key: key("asm"),
			owner_entity: estimateKey,
			statement: assumption.text,
			...(assumption.owner ? { owner_user_id: assumption.owner } : {}),
			status: assumption.owner ? "owned" : "open",
			...provenance(actor, now),
		});
	}
	return { estimateKey, calculation };
}

export async function create(
	ctx: MutationCtx,
	payload: CreateEstimatePayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const lead = await byKey(ctx, "leads", payload.lead_id);
	if (!lead) throw new EstimateServiceError("NOT_FOUND", "Lead not found");
	if (lead.stage !== "Scope In Progress") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED lead stage must be Scope In Progress",
		);
	}
	const { estimateKey, calculation } = await insertVersion(
		ctx,
		payload,
		actor,
		1,
	);
	return {
		record_id: estimateKey,
		status: "draft",
		to_state: "draft",
		entity_refs: [payload.lead_id, payload.rate_set_version],
		facts: {
			version: 1,
			rate_set_version: payload.rate_set_version,
			formula_set_version: FORMULA_SET_VERSION,
			calculation_id: calculation.calculation_id,
		},
	};
}

export async function findEstimate(ctx: MutationCtx, estimateId: string) {
	const estimate = await byKey(ctx, "estimates", estimateId);
	if (!estimate)
		throw new EstimateServiceError("NOT_FOUND", "Estimate not found");
	return estimate;
}

export async function reviewGateFailures(
	ctx: MutationCtx,
	estimate: Doc<"estimates">,
) {
	const failures: string[] = [];
	const lead = estimate.lead_id
		? await byKey(ctx, "leads", estimate.lead_id)
		: null;
	if (lead?.stage !== "Scope In Progress")
		failures.push("lead stage/scope sheet");
	const lines = await ctx.db
		.query("estimate_lines")
		.filter((query) => query.eq(query.field("estimate_id"), estimate.key))
		.collect();
	if (lines.length === 0) failures.push("takeoff requires at least one line");
	for (const kind of ["prep", "setup", "cleanup"]) {
		if (!lines.some((line) => line.kind === kind))
			failures.push(`${kind} line required`);
	}
	if (
		!lines.some((line) => line.kind === "labor" && (line.burdened_pct ?? 0) > 0)
	) {
		failures.push("burdened labor line required");
	}
	if (lines.some((line) => !line.epistemic))
		failures.push("every line needs epistemic");
	const assumptions = await ctx.db
		.query("assumptions")
		.filter((query) => query.eq(query.field("owner_entity"), estimate.key))
		.collect();
	const missingOwners = assumptions
		.filter((assumption) => !assumption.owner_user_id)
		.map((assumption) => assumption.key);
	if (missingOwners.length)
		failures.push(`missing owners: ${missingOwners.join(",")}`);
	const rateSet = estimate.source_ref
		? await byKey(ctx, "rate_sets", estimate.source_ref)
		: null;
	if (rateSet?.status !== "approved") failures.push("rate set still approved");
	return { failures, missingOwners, lines };
}

export async function submitForReview(
	ctx: MutationCtx,
	payload: { estimate_id: string },
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const estimate = await findEstimate(ctx, payload.estimate_id);
	if (estimate.status !== "draft") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED status must be draft",
		);
	}
	const { failures } = await reviewGateFailures(ctx, estimate);
	if (failures.length) {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			`GUARD_BLOCKED ${failures.join("; ")}`,
		);
	}
	await ctx.db.patch(estimate._id, {
		status: "anthony_review",
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
	});
	return {
		record_id: estimate.key,
		status: "anthony_review",
		from_state: "draft",
		to_state: "anthony_review",
	};
}

export async function reprice(
	ctx: MutationCtx,
	payload: {
		estimate_id: string;
		changed_lines?: EstimateLinePayload[];
		reason: string;
	},
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const previous = await findEstimate(ctx, payload.estimate_id);
	if (
		!["draft", "anthony_review", "rework", "approved"].includes(previous.status)
	) {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED estimate cannot be repriced",
		);
	}
	const oldLines = await ctx.db
		.query("estimate_lines")
		.filter((query) => query.eq(query.field("estimate_id"), previous.key))
		.collect();
	const lines =
		payload.changed_lines ??
		oldLines.map((line) => ({
			rate_row_ref: line.rate_row_id,
			kind: line.kind ?? "material",
			label: line.cost_code,
			quantity: line.quantity,
			unit: line.unit,
			burdened_pct: line.burdened_pct,
			epistemic: line.epistemic,
		}));
	if (!previous.lead_id || !previous.source_ref) {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED pinned inputs missing",
		);
	}
	const versions = await ctx.db
		.query("estimates")
		.filter((query) => query.eq(query.field("lead_id"), previous.lead_id))
		.collect();
	const newVersion = Math.max(...versions.map((item) => item.version)) + 1;
	const { estimateKey } = await insertVersion(
		ctx,
		{
			lead_id: previous.lead_id,
			rate_set_version: previous.source_ref,
			lines,
			assumptions: [],
		},
		actor,
		newVersion,
		previous.key,
	);
	return {
		record_id: estimateKey,
		status: "draft",
		from_state: previous.status,
		to_state: "draft",
		reason: payload.reason,
		entity_refs: [previous.key],
		facts: { new_version: newVersion, supersedes: previous.key },
	};
}

export async function abandon(
	ctx: MutationCtx,
	payload: { estimate_id: string; reason: string },
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const estimate = await findEstimate(ctx, payload.estimate_id);
	if (estimate.status !== "draft") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED only drafts may be abandoned",
		);
	}
	await ctx.db.patch(estimate._id, {
		status: "abandoned",
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
	});
	return {
		record_id: estimate.key,
		status: "abandoned",
		from_state: "draft",
		to_state: "abandoned",
		reason: payload.reason,
	};
}

export type ClaimAssumptionPayload = {
	assumption_id: string;
	owner_user_id: string;
};

export async function claimAssumption(
	ctx: MutationCtx,
	payload: ClaimAssumptionPayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const assumption = await ctx.db
		.query("assumptions")
		.withIndex("by_key", (query) => query.eq("key", payload.assumption_id))
		.unique();
	if (!assumption)
		throw new EstimateServiceError("NOT_FOUND", "Assumption not found");
	if (assumption.status !== "open") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED assumption must be open to claim",
		);
	}
	const now = new Date().toISOString();
	await ctx.db.patch(assumption._id, {
		owner_user_id: payload.owner_user_id,
		status: "owned",
		updated_by: actor.user_key,
		updated_at: now,
	});
	return {
		record_id: assumption.key,
		status: "owned",
		from_state: "open",
		to_state: "owned",
		entity_refs: [assumption.owner_entity],
		facts: { owner_user_id: payload.owner_user_id },
	};
}
