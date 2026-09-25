import type { DatabaseWriter } from "./_generated/server";
import type { ResolvedUser } from "./identity";

export const COMPANY_ID = "co_skys";
const SCHEMA_VERSION = 1;
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type IntakePayload = {
	account_id: string;
	channel: string;
	contact_id?: string;
};

export type OpportunityKeyPayload = { opportunity_key: string };
export type BidNoBidPayload = OpportunityKeyPayload & {
	bid_no_bid: boolean;
	no_go_reason?: string;
};

export type ServiceResult = {
	record_id: string;
	status: string;
	from_state?: string;
	to_state?: string;
};

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

export async function intake(
	db: DatabaseWriter,
	payload: IntakePayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const now = new Date().toISOString();
	const key = `opp_${newUlid()}`;
	await db.insert("opportunities", {
		key,
		account_id: payload.account_id,
		channel: payload.channel,
		...(payload.contact_id ? { contact_id: payload.contact_id } : {}),
		status: "intake",
		bid_no_bid: false,
		created_by: actor.user_key,
		created_at: now,
		updated_by: actor.user_key,
		updated_at: now,
		source: "opportunity.intake",
		schema_version: SCHEMA_VERSION,
		company_id: COMPANY_ID,
	});
	return { record_id: key, status: "intake", to_state: "intake" };
}

export async function qualify(
	db: DatabaseWriter,
	payload: OpportunityKeyPayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const opportunity = await db
		.query("opportunities")
		.withIndex("by_key", (q) => q.eq("key", payload.opportunity_key))
		.unique();
	if (!opportunity)
		throw new Error(`Opportunity ${payload.opportunity_key} not found`);
	await db.patch(opportunity._id, {
		status: "qualified",
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
	});
	return {
		record_id: opportunity.key,
		status: "qualified",
		from_state: opportunity.status,
		to_state: "qualified",
	};
}

export async function bidNoBid(
	db: DatabaseWriter,
	payload: BidNoBidPayload,
	actor: ResolvedUser,
): Promise<ServiceResult> {
	const opportunity = await db
		.query("opportunities")
		.withIndex("by_key", (q) => q.eq("key", payload.opportunity_key))
		.unique();
	if (!opportunity)
		throw new Error(`Opportunity ${payload.opportunity_key} not found`);
	await db.patch(opportunity._id, {
		bid_no_bid: payload.bid_no_bid,
		...(payload.bid_no_bid
			? { no_go_reason: undefined }
			: { no_go_reason: payload.no_go_reason }),
		updated_by: actor.user_key,
		updated_at: new Date().toISOString(),
	});
	return { record_id: opportunity.key, status: opportunity.status };
}
