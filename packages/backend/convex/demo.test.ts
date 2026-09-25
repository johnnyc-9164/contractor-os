import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");
const CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_DEMO_DATA";

function setup() {
	const t = convexTest(schema, modules);
	contractorOsTest.register(t);
	return t;
}

async function demoCount(
	t: ReturnType<typeof setup>,
	table:
		| "leads"
		| "estimates"
		| "estimate_lines"
		| "jobs"
		| "job_phases"
		| "invoices"
		| "change_orders",
): Promise<number> {
	return t.run(async (ctx) => {
		const docs = await ctx.db.query(table).collect();
		return docs.filter((d) => d.company_id === "co_demo").length;
	});
}

describe("demo seed/reset", () => {
	it("seed produces the full snapshot with exact counts", async () => {
		const t = setup();
		const counts = await t.mutation(internal.demo.seed, {
			confirmation: CONFIRMATION,
		});
		expect(counts).toEqual({
			leads: 12,
			estimates: 3,
			estimate_lines: 9,
			jobs: 2,
			job_phases: 4,
			invoices: 3,
			change_orders: 1,
		});
	});

	it("seeds 12 leads across at least 10 distinct stages", async () => {
		const t = setup();
		await t.mutation(internal.demo.seed, { confirmation: CONFIRMATION });
		const stages = await t.run(async (ctx) => {
			const docs = await ctx.db.query("leads").collect();
			return docs.filter((d) => d.company_id === "co_demo").map((d) => d.stage);
		});
		expect(stages).toHaveLength(12);
		expect(new Set(stages).size).toBeGreaterThanOrEqual(10);
	});

	it("seeds the Holly Rasmussen Prospect lead with exact demo-script details", async () => {
		const t = setup();
		await t.mutation(internal.demo.seed, { confirmation: CONFIRMATION });
		const holly = await t.run(async (ctx) => {
			const docs = await ctx.db.query("leads").collect();
			return docs.find(
				(d) => d.contact_email === "holly.rasmussen@example.com",
			);
		});
		expect(holly).toBeDefined();
		expect(holly?.contact_name).toBe("Holly Rasmussen");
		expect(holly?.contact_phone).toBe("555-0142");
		expect(holly?.contact_email).toBe("holly.rasmussen@example.com");
		expect(holly?.stage).toBe("Prospect");
		expect(holly?.notes).toContain("4521 Xerxes Ave S");
		expect(holly?.notes).toContain("exterior siding repaint");
		expect(holly?.notes).toContain("peeling on the south side");
		expect(holly?.notes).toContain("wants it done before first snow");
		expect(holly?.company_id).toBe("co_demo");
	});

	it("every estimate has at least 3 lines", async () => {
		const t = setup();
		await t.mutation(internal.demo.seed, { confirmation: CONFIRMATION });
		const perEstimate = await t.run(async (ctx) => {
			const estimates = (await ctx.db.query("estimates").collect()).filter(
				(d) => d.company_id === "co_demo",
			);
			const lines = (await ctx.db.query("estimate_lines").collect()).filter(
				(d) => d.company_id === "co_demo",
			);
			return estimates.map(
				(e) => lines.filter((l) => l.estimate_id === e.key).length,
			);
		});
		expect(perEstimate).toHaveLength(3);
		for (const n of perEstimate) expect(n).toBeGreaterThanOrEqual(3);
	});

	it("seed is idempotent — second run produces identical counts", async () => {
		const t = setup();
		const first = await t.mutation(internal.demo.seed, {
			confirmation: CONFIRMATION,
		});
		const second = await t.mutation(internal.demo.seed, {
			confirmation: CONFIRMATION,
		});
		expect(second).toEqual(first);
	});

	it("reset wipes only demo records and leaves a non-demo lead untouched", async () => {
		const t = setup();
		const now = new Date().toISOString();
		await t.run(async (ctx) => {
			await ctx.db.insert("leads", {
				key: "lead_real_01",
				title: "Real customer — must survive reset",
				source: "phone",
				stage: "Prospect",
				created_by: "system",
				created_at: now,
				updated_by: "system",
				updated_at: now,
				source_ref: "real",
				schema_version: 1,
				company_id: "co_skys",
			});
		});
		await t.mutation(internal.demo.seed, { confirmation: CONFIRMATION });
		const resetCounts = await t.mutation(internal.demo.reset, {
			confirmation: CONFIRMATION,
		});
		expect(resetCounts.leads).toBe(12);

		const remaining = await t.run(async (ctx) => {
			return await ctx.db.query("leads").collect();
		});
		expect(remaining).toHaveLength(1);
		expect(remaining[0].key).toBe("lead_real_01");
		expect(remaining[0].company_id).toBe("co_skys");

		for (const table of [
			"estimates",
			"estimate_lines",
			"jobs",
			"job_phases",
			"invoices",
			"change_orders",
		] as const) {
			expect(await demoCount(t, table)).toBe(0);
		}
		expect(await demoCount(t, "leads")).toBe(0);
	});

	it("seed and reset require the confirmation string", async () => {
		const t = setup();
		await expect(
			t.mutation(internal.demo.seed, { confirmation: "nope" }),
		).rejects.toThrow();
		await expect(
			t.mutation(internal.demo.reset, { confirmation: "" }),
		).rejects.toThrow();
	});

	it("dataset contains zero real-person data", async () => {
		const t = setup();
		await t.mutation(internal.demo.seed, { confirmation: CONFIRMATION });
		const blobs = await t.run(async (ctx) => {
			const out: string[] = [];
			for (const table of [
				"leads",
				"estimates",
				"estimate_lines",
				"jobs",
				"invoices",
				"change_orders",
			] as const) {
				for (const d of await ctx.db.query(table).collect()) {
					out.push(JSON.stringify(d));
				}
			}
			return out.join("\n");
		});
		// Fictional markers required everywhere; real business identity absent.
		expect(blobs).toContain("co_demo");
		expect(blobs).toContain("demo-seed");
		expect(blobs).not.toMatch(/651[- ]?410[- ]?4196/);
		expect(blobs).not.toContain("skysthelimitpainting");
		expect(blobs).not.toMatch(
			/[a-z0-9._%+-]+@(?!example\.com)[a-z0-9.-]+\.[a-z]{2,}/i,
		);
	});
});
