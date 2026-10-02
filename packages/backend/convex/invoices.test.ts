import contractorOsTest from "@johnnyc2026/contractor-os-core/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
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
	await t.run(async (ctx) => {
		await ctx.db.insert("contractorOsMemberships", {
			tokenIdentifier: subject,
			tenantId,
			enabled,
			role: "viewer",
		});
	});
	return t.withIdentity({ tokenIdentifier: subject });
}

async function invoice(
	t: ReturnType<typeof setup>,
	tenantId: string,
	identifier: string,
) {
	await t.mutation(components.contractorOs.records.co_invoice.create, {
		tenantId,
		actorId: "seed",
		requestKey: `seed-${tenantId}-${identifier}`,
		identifier,
		title: identifier,
		properties: { status: "draft", invoice_number: identifier, amount: 12.34 },
	});
}

describe("invoice read projection", () => {
	it("paginates only the caller tenant without duplicates", async () => {
		const t = setup();
		const a = await member(t, "issuer|alice", "tenant-a");
		const b = await member(t, "issuer|bob", "tenant-b");
		await invoice(t, "tenant-b", "b-1");
		await invoice(t, "tenant-a", "a-1");
		await invoice(t, "tenant-b", "b-2");
		await invoice(t, "tenant-a", "a-2");
		await invoice(t, "tenant-a", "a-3");
		const first = await a.query(api.backend.listInvoices, {
			paginationOpts: { cursor: null, numItems: 2 },
		});
		expect(
			first.page.map((row: { identifier: string }) => row.identifier),
		).toEqual(["a-1", "a-2"]);
		expect(first.isDone).toBe(false);
		const second = await a.query(api.backend.listInvoices, {
			paginationOpts: { cursor: first.continueCursor, numItems: 2 },
		});
		expect(
			second.page.map((row: { identifier: string }) => row.identifier),
		).toEqual(["a-3"]);
		expect(second.isDone).toBe(true);
		expect(
			(
				await b.query(api.backend.listInvoices, {
					paginationOpts: { cursor: null, numItems: 2 },
				})
			).page.map((row: { identifier: string }) => row.identifier),
		).toEqual(["b-1", "b-2"]);
		expect(
			[...first.page, ...second.page].map((row) => row.identifier),
		).toEqual(["a-1", "a-2", "a-3"]);
		expect(first.page[0]).toMatchObject({
			invoiceNumber: "a-1",
			amount: 12.34,
			status: "draft",
		});
		expect(first.page[0]).not.toHaveProperty("tenantId");
	});

	it("denies anonymous and disabled memberships before reading invoices", async () => {
		const t = setup();
		const disabled = await member(t, "issuer|disabled", "tenant-a", false);
		await expect(
			t.query(api.backend.listInvoices, {
				paginationOpts: { cursor: null, numItems: 2 },
			}),
		).rejects.toThrow("UNAUTHENTICATED");
		await expect(
			disabled.query(api.backend.listInvoices, {
				paginationOpts: { cursor: null, numItems: 2 },
			}),
		).rejects.toThrow("FORBIDDEN");
	});
});
