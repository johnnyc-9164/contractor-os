import type { MutationCtx } from "./_generated/server.js";
import {
	EstimateServiceError,
	findEstimate,
	reviewGateFailures,
} from "./estimate";
import { sha256Hex, stableStringify } from "./events";
import type { ResolvedUser } from "./identity";
import { COMPANY_ID, type ServiceResult } from "./lead";

function key(): string {
	return `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function decision(
	ctx: MutationCtx,
	estimateId: string,
	text: string,
	actor: ResolvedUser,
	artifactHash?: string,
) {
	const now = new Date().toISOString();
	const decisionKey = key();
	await ctx.db.insert("decisions", {
		key: decisionKey,
		subject_entity: estimateId,
		decision_text: text,
		decided_by: actor.user_key,
		decided_at: now,
		artifact_hash: artifactHash,
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source: "catalog.dispatch",
		schema_version: 1,
		company_id: COMPANY_ID,
	});
	return decisionKey;
}

export async function technical(
	ctx: MutationCtx,
	payload: {
		estimate_id: string;
		decision: "approve" | "reject";
		reason?: string;
	},
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const estimate = await findEstimate(ctx, payload.estimate_id);
	if (estimate.status !== "anthony_review") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED status must be anthony_review",
		);
	}
	const gates = await reviewGateFailures(ctx, estimate);
	if (gates.failures.length) {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			`GUARD_BLOCKED ${gates.failures.join("; ")}`,
		);
	}
	const { base_total_cents: engineTotal } = estimate;
	if (engineTotal <= 0) {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED validation margin/band/completeness",
		);
	}
	if (payload.decision === "reject") {
		const decisionId = await decision(
			ctx,
			estimate.key,
			`technical rejected: ${payload.reason}`,
			actor,
		);
		await ctx.db.patch(estimate._id, {
			status: "rework",
			updated_by: actor.user_key,
			updated_at: new Date().toISOString(),
		});
		return {
			record_id: estimate.key,
			status: "rework",
			from_state: "anthony_review",
			to_state: "rework",
			reason: payload.reason,
			event_action: "technical.rejected",
			entity_refs: [decisionId],
		};
	}
	const artifactHash = await sha256Hex(
		stableStringify({
			estimate: estimate.key,
			version: estimate.version,
			engine_total_cents: engineTotal,
			lines: gates.lines.map((calculationLine) => ({
				key: calculationLine.key,
				amount: calculationLine.extended_cost_cents,
				calculation_id: calculationLine.formula_ref,
			})),
		}),
	);
	const decisionId = await decision(
		ctx,
		estimate.key,
		"technical approved",
		actor,
		artifactHash,
	);
	await ctx.db.patch(estimate._id, {
		status: "approved",
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
	});
	if (estimate.supersedes_version_id) {
		const previous = await findEstimate(ctx, estimate.supersedes_version_id);
		if (previous.status === "approved") {
			await ctx.db.patch(previous._id, {
				status: "superseded",
				updated_by: actor.user_key,
				updated_at: new Date().toISOString(),
			});
		}
	}
	return {
		record_id: estimate.key,
		status: "approved",
		from_state: "anthony_review",
		to_state: "approved",
		event_action: "technical.approved",
		entity_refs: [decisionId],
		facts: { artifact_hash: artifactHash },
	};
}

export async function commercial(
	ctx: MutationCtx,
	payload: { estimate_id: string },
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const estimate = await findEstimate(ctx, payload.estimate_id);
	if (estimate.status !== "approved") {
		throw new EstimateServiceError(
			"GUARD_BLOCKED",
			"GUARD_BLOCKED technical approval required",
		);
	}
	const warnings: string[] = [];
	if (estimate.margin_pct < 10) warnings.push("margin below 10 percent");
	if (estimate.margin_pct > 60) warnings.push("margin above 60 percent");
	const decisionId = await decision(
		ctx,
		estimate.key,
		`commercial reviewed; warnings=${warnings.join("; ") || "none"}`,
		actor,
	);
	return {
		record_id: estimate.key,
		status: "approved",
		event_action: "commercial.reviewed",
		entity_refs: [decisionId],
		facts: { warnings },
	};
}
