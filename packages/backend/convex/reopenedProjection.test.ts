import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, components } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function member(
	t: ReturnType<typeof setup>,
	subject: string,
	tenantId: string,
	enabled = true,
) {
	await t.run((ctx) =>
		ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier: subject,
			tenantId,
			enabled,
			role: "admin",
		}),
	);
	return t.withIdentity({ tokenIdentifier: subject });
}

async function seedLead(
	t: ReturnType<typeof setup>,
	tenantId: string,
	identifier: string,
) {
	await t.mutation(components.contractorOs.records.co_lead.create, {
		tenantId,
		actorId: "seed",
		requestKey: `seed-${tenantId}-${identifier}`,
		identifier,
		title: `${tenantId} ${identifier}`,
		properties: { stage: "new" },
	});
}

async function pages(
	reader: ReturnType<ReturnType<typeof setup>["withIdentity"]>,
	numItems: number,
) {
	const rows: Array<{ id: string; identifier: string; state: string }> = [];
	let cursor: string | null = null;
	for (let index = 0; index < 10; index += 1) {
		const result = await reader.query(api.backend.listLeads, {
			paginationOpts: { cursor, numItems },
		});
		rows.push(...result.page);
		if (result.isDone) return rows;
		expect(result.continueCursor).not.toBe(cursor);
		cursor = result.continueCursor;
	}
	throw new Error("listLeads cursor failed to finish");
}

describe("reopened lead projection", () => {
	it("persists the new identity for another tenant A session beyond page one without leaking a colliding tenant B ID", async () => {
		const t = setup();
		const writer = await member(t, "issuer|a-writer", "tenant-a");
		const reader = await member(t, "issuer|a-reader", "tenant-a");
		const tenantB = await member(t, "issuer|b-reader", "tenant-b");
		const now = new Date().toISOString();
		await t.run(async (ctx) => {
			await ctx.db.insert("users", {
				key: "usr_a",
				display_name: "A Writer",
				role: "principal",
				status: "active",
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
			await ctx.db.insert("identity_bindings", {
				key: "bind_a",
				user_id: "usr_a",
				provider: "clerk",
				provider_subject: "issuer|a-writer",
				status: "active",
				bound_at: now,
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source: "test",
				schema_version: 1,
				company_id: "co_skys",
			});
			await ctx.db.insert("leads", {
				key: "lead_source_a",
				tenantId: "tenant-a",
				title: "Tenant A source",
				source: "referral",
				stage: "Lost",
				co_lead_id: "shared-id",
				created_by: "usr_a",
				created_at: now,
				updated_by: "usr_a",
				updated_at: now,
				schema_version: 1,
				company_id: "co_skys",
			});
		});
		await seedLead(t, "tenant-a", "shared-id");
		await seedLead(t, "tenant-b", "shared-id");
		const reopened = await writer.mutation(api.catalog.dispatch, {
			contract: "lead.reopen",
			schema_version: 1,
			idempotency_key: "reopen-a-source",
			payload: { lead_id: "lead_source_a", reason: "New request" },
		});
		expect(reopened.ok).toBe(true);
		const reopenedId = reopened.record_id as string;
		expect(reopenedId).toMatch(/^lead_/);
		expect(reopenedId).not.toBe("lead_source_a");
		await seedLead(t, "tenant-a", "a-extra-1");
		await seedLead(t, "tenant-a", "a-extra-2");
		const original = await t.run((ctx) =>
			ctx.db
				.query("leads")
				.withIndex("by_key", (q) => q.eq("key", "lead_source_a"))
				.unique(),
		);
		expect(original?.stage).toBe("Lost");

		const aRows = await pages(reader, 2);
		const bRows = await pages(tenantB, 2);
		expect(aRows.map((row) => row.identifier)).toContain("shared-id");
		expect(bRows.map((row) => row.identifier)).toEqual(["shared-id"]);
		expect(new Set(aRows.map((row) => row.identifier)).size).toBe(aRows.length);
		expect(aRows.map((row) => row.identifier)).toContain(reopenedId);
		expect(bRows.map((row) => row.identifier)).not.toContain(reopenedId);

		const outreach = await writer.mutation(api.catalog.dispatch, {
			contract: "lead.sendOutreach",
			schema_version: 1,
			idempotency_key: "outreach-reopened-a",
			payload: { lead_id: reopenedId, channel: "call" },
		});
		expect(outreach.ok).toBe(true);
		expect(outreach.record_id).toBe(reopenedId);
		const afterOutreach = await pages(reader, 2);
		expect(
			afterOutreach.find((row) => row.identifier === reopenedId)?.state,
		).toBe("Outreach Sent");
		const reply = await writer.mutation(api.catalog.dispatch, {
			contract: "lead.recordReply",
			schema_version: 1,
			idempotency_key: "reply-reopened-a",
			payload: { lead_id: reopenedId, reply_summary: "Interested" },
		});
		expect(reply.ok).toBe(true);
		await t.mutation(components.contractorOs.records.co_client.create, {
			tenantId: "tenant-a",
			actorId: "seed",
			requestKey: "seed-client-reopened",
			identifier: "client-reopened",
			title: "Reopened client",
			properties: { status: "prospect" },
		});
		const qualified = await writer.mutation(api.catalog.dispatch, {
			contract: "lead.qualify",
			schema_version: 1,
			idempotency_key: "qualify-reopened-a",
			payload: { lead_id: reopenedId, client_name: "client-reopened" },
		});
		expect(qualified.ok).toBe(true);
		expect(qualified.record_id).toBe(reopenedId);
		const afterQualification = await pages(reader, 2);
		expect(
			afterQualification.filter((row) => row.identifier === reopenedId),
		).toHaveLength(1);
		expect(
			afterQualification.find((row) => row.identifier === reopenedId)?.state,
		).toBe("Qualifying");
		expect(
			(
				await t.run((ctx) =>
					ctx.db
						.query("leads")
						.withIndex("by_key", (q) => q.eq("key", "lead_source_a"))
						.unique(),
				)
			)?.stage,
		).toBe("Lost");
	});

	it("denies anonymous and disabled members", async () => {
		const t = setup();
		const disabled = await member(t, "issuer|disabled", "tenant-a", false);
		await expect(
			t.query(api.backend.listLeads, {
				paginationOpts: { cursor: null, numItems: 2 },
			}),
		).rejects.toThrow("UNAUTHENTICATED");
		await expect(
			disabled.query(api.backend.listLeads, {
				paginationOpts: { cursor: null, numItems: 2 },
			}),
		).rejects.toThrow("FORBIDDEN");
	});
});

async function principal(
	t: ReturnType<typeof setup>,
	subject: string,
	tenantId: string,
	userKey: string,
) {
	const authed = await member(t, subject, tenantId);
	const now = new Date().toISOString();
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			key: userKey,
			display_name: userKey,
			role: "principal",
			status: "active",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "test",
			schema_version: 1,
			company_id: "co_skys",
		});
		await ctx.db.insert("identity_bindings", {
			key: `bind_${userKey}`,
			user_id: userKey,
			provider: "clerk",
			provider_subject: subject,
			status: "active",
			bound_at: now,
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "test",
			schema_version: 1,
			company_id: "co_skys",
		});
	});
	return authed;
}

async function localLead(
	t: ReturnType<typeof setup>,
	key: string,
	stage: "Prospect" | "Lost",
	createdBy: string,
	tenantId?: string,
	coLeadId?: string,
) {
	const now = new Date().toISOString();
	await t.run((ctx) =>
		ctx.db.insert("leads", {
			key,
			...(tenantId ? { tenantId } : {}),
			title: key,
			source: "referral",
			stage,
			...(coLeadId ? { co_lead_id: coLeadId } : {}),
			created_by: createdBy,
			created_at: now,
			updated_by: createdBy,
			updated_at: now,
			schema_version: 1,
			company_id: "co_skys",
		}),
	);
}

function dispatch(
	t: ReturnType<ReturnType<typeof setup>["withIdentity"]>,
	contract: string,
	key: string,
	payload: unknown,
) {
	return t.mutation(api.catalog.dispatch, {
		contract,
		schema_version: 1,
		idempotency_key: key,
		payload,
	});
}

describe("reopened lead tenant boundaries", () => {
	it("rejects tenantless legacy rows despite colliding component identifiers", async () => {
		const t = setup();
		const a = await principal(t, "issuer|legacy-a", "tenant-a", "usr_legacy_a");
		await member(t, "issuer|legacy-b", "tenant-b");
		await seedLead(t, "tenant-a", "shared-legacy");
		await seedLead(t, "tenant-b", "shared-legacy");
		await localLead(
			t,
			"lead_legacy",
			"Lost",
			"usr_legacy_a",
			undefined,
			"shared-legacy",
		);

		const reopen = await dispatch(
			t.withIdentity({ tokenIdentifier: "issuer|legacy-a" }),
			"lead.reopen",
			"legacy-reopen",
			{
				lead_id: "lead_legacy",
				reason: "Again",
			},
		);
		expect(reopen.error?.code).toBe("NOT_FOUND");
		const followup = await dispatch(a, "lead.sendOutreach", "legacy-followup", {
			lead_id: "lead_legacy",
			channel: "call",
		});
		expect(followup.error?.code).toBe("NOT_FOUND");
		expect((await pages(a, 2)).map((row) => row.identifier)).not.toContain(
			"lead_legacy",
		);
	});

	it("keeps colliding component IDs and local keys inside the caller tenant", async () => {
		const t = setup();
		const a = await principal(t, "issuer|scope-a", "tenant-a", "usr_scope_a");
		const b = await principal(t, "issuer|scope-b", "tenant-b", "usr_scope_b");
		await seedLead(t, "tenant-a", "shared-scope");
		await seedLead(t, "tenant-b", "shared-scope");
		await localLead(
			t,
			"lead_only_a",
			"Lost",
			"usr_scope_a",
			"tenant-a",
			"shared-scope",
		);
		await localLead(
			t,
			"lead_only_b",
			"Prospect",
			"usr_scope_b",
			"tenant-b",
			"shared-scope",
		);

		expect(
			(
				await dispatch(b, "lead.reopen", "foreign-source", {
					lead_id: "lead_only_a",
					reason: "Wrong tenant",
				})
			).error?.code,
		).toBe("NOT_FOUND");
		expect(
			(
				await dispatch(b, "lead.sendOutreach", "foreign-followup", {
					lead_id: "lead_only_a",
					channel: "call",
				})
			).error?.code,
		).toBe("NOT_FOUND");
		const own = await dispatch(b, "lead.sendOutreach", "own-collision", {
			lead_id: "shared-scope",
			channel: "call",
		});
		expect(own.ok).toBe(true);
		expect(own.record_id).toBe("lead_only_b");

		const reopened = await dispatch(a, "lead.reopen", "scope-a-reopen", {
			lead_id: "lead_only_a",
			reason: "Again",
		});
		expect(reopened.ok).toBe(true);
		expect(
			(
				await dispatch(b, "lead.sendOutreach", "foreign-reopened", {
					lead_id: reopened.record_id,
					channel: "call",
				})
			).error?.code,
		).toBe("NOT_FOUND");
		expect((await pages(b, 2)).map((row) => row.identifier)).not.toContain(
			reopened.record_id,
		);
	});

	it("removes the local row when component projection creation fails", async () => {
		const t = setup();
		const a = await principal(
			t,
			"issuer|rollback-a",
			"tenant-a",
			"usr_rollback_a",
		);
		await localLead(
			t,
			"lead_rollback_source",
			"Lost",
			"usr_rollback_a",
			"tenant-a",
		);
		const timestamp = 1_700_000_000_000;
		const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
		let remaining = timestamp;
		let timePart = "";
		for (let index = 0; index < 10; index += 1) {
			timePart = alphabet[remaining % 32] + timePart;
			remaining = Math.floor(remaining / 32);
		}
		const predictedKey = `lead_${timePart}${"0".repeat(16)}`;
		await seedLead(t, "tenant-a", predictedKey);
		const dateNow = vi.spyOn(Date, "now").mockReturnValue(timestamp);
		const random = vi.spyOn(Math, "random").mockReturnValue(0);
		try {
			const response = await dispatch(a, "lead.reopen", "rollback-reopen", {
				lead_id: "lead_rollback_source",
				reason: "Again",
			});
			expect(response.ok).toBe(false);
			const projected = await t.run((ctx) =>
				ctx.db
					.query("leads")
					.withIndex("by_tenant_key", (q) =>
						q.eq("tenantId", "tenant-a").eq("key", predictedKey),
					)
					.unique(),
			);
			expect(projected).toBeNull();
			expect(
				(await pages(a, 10)).filter((row) => row.identifier === predictedKey),
			).toHaveLength(1);
		} finally {
			random.mockRestore();
			dateNow.mockRestore();
		}
	});
});
