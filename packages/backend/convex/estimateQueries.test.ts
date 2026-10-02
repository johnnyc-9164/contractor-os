import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
type ApprovedEstimateListResult = {
	page: Array<{
		estimateKey: string;
		leadKey: string;
		version: number;
		status: "approved";
		baseTotalCents: number;
	}>;
	isDone: boolean;
	continueCursor: string;
};

const listApproved = makeFunctionReference<
	"query",
	{
		leadId: string;
		paginationOpts: { cursor: string | null; numItems: number };
	},
	ApprovedEstimateListResult
>("estimateQueries:listApproved");

const COMPANY_A = "co_alpha";
const COMPANY_B = "co_beta";
const SUBJECT_A = "https://clerk.test.local|approved-estimates-alpha";
const SUBJECT_B = "https://clerk.test.local|approved-estimates-beta";

function setup() {
	return convexTest(schema, modules);
}

type UserRole = "owner" | "principal" | "crew" | "viewer" | "agent_owner";

async function seedCaller(
	t: ReturnType<typeof setup>,
	options: {
		subject: string;
		companyId: string;
		userKey: string;
		role?: UserRole;
		userStatus?: string;
		membershipEnabled?: boolean;
		membershipTenantId?: string;
		bindingStatus?: "active" | "superseded" | "revoked";
	},
) {
	const now = "2026-09-27T00:00:00.000Z";
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			key: options.userKey,
			display_name: options.userKey,
			role: options.role ?? "viewer",
			status: options.userStatus ?? "active",
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "other",
			schema_version: 1,
			company_id: options.companyId,
		});
		await ctx.db.insert("identity_bindings", {
			key: `bind_${options.userKey}`,
			user_id: options.userKey,
			provider: "clerk",
			provider_subject: options.subject,
			status: options.bindingStatus ?? "active",
			bound_at: now,
			created_by: "system",
			created_at: now,
			updated_by: "system",
			updated_at: now,
			source: "test",
			schema_version: 1,
			company_id: options.companyId,
		});
		await ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier: options.subject,
			tenantId: options.membershipTenantId ?? options.companyId,
			enabled: options.membershipEnabled ?? true,
			role: "viewer",
		});
	});
	return t.withIdentity({ tokenIdentifier: options.subject });
}

async function seedLead(
	t: ReturnType<typeof setup>,
	key: string,
	companyId: string,
	coLeadId?: string,
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("leads", {
			key,
			title: key,
			stage: "Scope In Progress",
			...(coLeadId ? { co_lead_id: coLeadId } : {}),
			created_by: "system",
			created_at: "2026-09-27T00:00:00.000Z",
			updated_by: "system",
			updated_at: "2026-09-27T00:00:00.000Z",
			source: "other",
			schema_version: 1,
			company_id: companyId,
		});
	});
}

async function seedEstimate(
	t: ReturnType<typeof setup>,
	options: {
		key: string;
		leadKey: string;
		companyId: string;
		version: number;
		status?: "draft" | "approved" | "rework" | "superseded";
		baseTotalCents?: number;
	},
) {
	return t.run(async (ctx) =>
		ctx.db.insert("estimates", {
			key: options.key,
			lead_id: options.leadKey,
			version: options.version,
			status: options.status ?? "approved",
			base_total_cents: options.baseTotalCents ?? options.version * 10_000,
			alternates: [{ private: "must not be projected" }],
			exclusions: ["private"],
			markup_pct: 10,
			margin_pct: 20,
			created_by: "system",
			created_at: `2026-09-27T00:00:0${options.version}.000Z`,
			updated_by: "system",
			updated_at: `2026-09-27T00:00:0${options.version}.000Z`,
			source: "test",
			schema_version: 1,
			company_id: options.companyId,
		}),
	);
}

const firstPage = (leadId: string, numItems = 10) => ({
	leadId,
	paginationOpts: { cursor: null, numItems },
});

describe("approved estimate query authorization", () => {
	it("rejects unauthenticated, unknown, revoked, inactive-user, agent, and disabled-membership callers", async () => {
		const t = setup();
		await seedLead(t, "lead_alpha", COMPANY_A);
		await seedEstimate(t, {
			key: "est_alpha",
			leadKey: "lead_alpha",
			companyId: COMPANY_A,
			version: 1,
		});

		await expect(
			t.query(listApproved, firstPage("lead_alpha")),
		).rejects.toThrow("unauthenticated");
		await expect(
			t
				.withIdentity({ tokenIdentifier: "unknown" })
				.query(listApproved, firstPage("lead_alpha")),
		).rejects.toThrow("identity");

		for (const denied of [
			{ suffix: "revoked", bindingStatus: "revoked" as const },
			{ suffix: "inactive", userStatus: "disabled" },
			{ suffix: "agent", role: "agent_owner" as const },
			{ suffix: "membership", membershipEnabled: false },
		]) {
			const caller = await seedCaller(t, {
				subject: `${SUBJECT_A}-${denied.suffix}`,
				companyId: COMPANY_A,
				userKey: `usr_${denied.suffix}`,
				...denied,
			});
			await expect(
				caller.query(listApproved, firstPage("lead_alpha")),
			).rejects.toThrow();
		}
		const mismatchedTenant = await seedCaller(t, {
			subject: `${SUBJECT_A}-mismatch`,
			companyId: COMPANY_A,
			membershipTenantId: COMPANY_B,
			userKey: "usr_mismatch",
		});
		await expect(
			mismatchedTenant.query(listApproved, firstPage("lead_alpha")),
		).rejects.toThrow("company access denied");
	});

	it("resolves both lead identifiers and returns only the bounded approved projection", async () => {
		const t = setup();
		const caller = await seedCaller(t, {
			subject: SUBJECT_A,
			companyId: COMPANY_A,
			userKey: "usr_alpha",
		});
		await seedLead(t, "lead_alpha", COMPANY_A, "co_lead_alpha");
		for (const [key, status, version] of [
			["est_approved", "approved", 1],
			["est_draft", "draft", 2],
			["est_rework", "rework", 3],
			["est_superseded", "superseded", 4],
		] as const) {
			await seedEstimate(t, {
				key,
				leadKey: "lead_alpha",
				companyId: COMPANY_A,
				version,
				status,
				baseTotalCents: 42_000,
			});
		}

		const byKey = await caller.query(listApproved, firstPage("lead_alpha"));
		const byComponentId = await caller.query(
			listApproved,
			firstPage("co_lead_alpha"),
		);
		expect(byKey.page).toEqual([
			{
				estimateKey: "est_approved",
				leadKey: "lead_alpha",
				version: 1,
				status: "approved",
				baseTotalCents: 42_000,
			},
		]);
		expect(byComponentId.page).toEqual(byKey.page);
		expect(Object.keys(byKey.page[0] ?? {}).sort()).toEqual(
			["baseTotalCents", "estimateKey", "leadKey", "status", "version"].sort(),
		);
	});

	it("isolates companies and leads before reading estimates", async () => {
		const t = setup();
		const companyA = await seedCaller(t, {
			subject: SUBJECT_A,
			companyId: COMPANY_A,
			userKey: "usr_alpha",
		});
		const companyB = await seedCaller(t, {
			subject: SUBJECT_B,
			companyId: COMPANY_B,
			userKey: "usr_beta",
		});
		await seedLead(t, "lead_alpha", COMPANY_A);
		await seedLead(t, "lead_alpha_other", COMPANY_A);
		await seedLead(t, "lead_beta", COMPANY_B);
		await seedEstimate(t, {
			key: "est_alpha",
			leadKey: "lead_alpha",
			companyId: COMPANY_A,
			version: 1,
		});
		await seedEstimate(t, {
			key: "est_cross_lead",
			leadKey: "lead_alpha_other",
			companyId: COMPANY_A,
			version: 1,
		});
		await seedEstimate(t, {
			key: "est_beta",
			leadKey: "lead_beta",
			companyId: COMPANY_B,
			version: 1,
		});
		await seedEstimate(t, {
			key: "est_beta_same_lead_key",
			leadKey: "lead_alpha",
			companyId: COMPANY_B,
			version: 2,
		});

		expect(
			(await companyA.query(listApproved, firstPage("lead_alpha"))).page.map(
				(row) => row.estimateKey,
			),
		).toEqual(["est_alpha"]);
		await expect(
			companyB.query(listApproved, firstPage("lead_alpha")),
		).rejects.toThrow("not found");
	});

	it("scopes component lead resolution to the caller company", async () => {
		const t = setup();
		const companyA = await seedCaller(t, {
			subject: SUBJECT_A,
			companyId: COMPANY_A,
			userKey: "usr_alpha",
		});
		const companyB = await seedCaller(t, {
			subject: SUBJECT_B,
			companyId: COMPANY_B,
			userKey: "usr_beta",
		});
		await seedLead(t, "lead_alpha", COMPANY_A, "co_lead_shared");
		await seedLead(t, "lead_beta", COMPANY_B, "co_lead_shared");
		await seedEstimate(t, {
			key: "est_alpha",
			leadKey: "lead_alpha",
			companyId: COMPANY_A,
			version: 1,
		});
		await seedEstimate(t, {
			key: "est_beta",
			leadKey: "lead_beta",
			companyId: COMPANY_B,
			version: 1,
		});

		expect(
			(
				await companyA.query(listApproved, firstPage("co_lead_shared"))
			).page.map((row) => row.estimateKey),
		).toEqual(["est_alpha"]);
		expect(
			(
				await companyB.query(listApproved, firstPage("co_lead_shared"))
			).page.map((row) => row.estimateKey),
		).toEqual(["est_beta"]);
	});

	it("reflects approval transitions and paginates stably across bounded pages", async () => {
		const t = setup();
		const caller = await seedCaller(t, {
			subject: SUBJECT_A,
			companyId: COMPANY_A,
			userKey: "usr_alpha",
		});
		await seedLead(t, "lead_alpha", COMPANY_A);
		await expect(
			caller.query(listApproved, firstPage("lead_alpha", 51)),
		).rejects.toThrow("page size");
		const transitioningId = await seedEstimate(t, {
			key: "est_transition",
			leadKey: "lead_alpha",
			companyId: COMPANY_A,
			version: 1,
			status: "draft",
		});
		expect(
			(await caller.query(listApproved, firstPage("lead_alpha"))).page,
		).toEqual([]);
		await t.run((ctx) => ctx.db.patch(transitioningId, { status: "approved" }));
		for (const version of [2, 3, 4]) {
			await seedEstimate(t, {
				key: `est_page_${version}`,
				leadKey: "lead_alpha",
				companyId: COMPANY_A,
				version,
			});
		}

		const seen: string[] = [];
		let cursor: string | null = null;
		let isDone = false;
		while (!isDone) {
			const result: ApprovedEstimateListResult = await caller.query(
				listApproved,
				{
					leadId: "lead_alpha",
					paginationOpts: { cursor, numItems: 2 },
				},
			);
			seen.push(...result.page.map((row) => row.estimateKey));
			cursor = result.continueCursor;
			isDone = result.isDone;
		}
		expect(seen).toEqual([
			"est_transition",
			"est_page_2",
			"est_page_3",
			"est_page_4",
		]);
		expect(new Set(seen).size).toBe(4);
	});
});
