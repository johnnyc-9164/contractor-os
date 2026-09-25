import { describe, expect, it } from "vitest";
import schema from "./schema.js";

// TC-BUILD-1 acceptance criterion 7: table-presence + provenance +
// key/index assertions. This test is the executable checklist for the
// Build Pack §22 transcription.

const EXPECTED_TABLES = [
	"leads",
	// 20 entities (§22.1)
	"opportunities",
	"accounts",
	"account_properties",
	"bids",
	"addenda",
	"rfi_log",
	"bid_scope_items",
	"estimates",
	"estimate_lines",
	"proposals",
	"jobs",
	"punch_items",
	"job_phases",
	"time_entries",
	"material_receipts",
	"equipment_usage",
	"equipment",
	"change_orders",
	"invoices",
	"pay_apps",
	"sov_lines",
	"pay_app_lines",
	"money_events",
	"retainage_releases",
	"lien_deadlines",
	"closeout_kits",
	"rate_sets",
	"rate_rows",
	"assembly_usages",
	"contacts",
	"vendors",
	"prequal_records",
	"campaigns",
	"touches",
	"dossiers",
	"dossier_entries",
	"maintenance_outlooks",
	// cross-cutting
	"users",
	"identity_bindings",
	"assumptions",
	"decisions",
	"evidence_items",
	"artifacts",
	"event_log",
	"agents",
	"jev_decisions",
	// mechanical
	"outbox_receipts",
	"export_runs",
	// preserved
	"contractorOsMemberships",
	// TC-SEC-01: tenant-isolation mapping for the CMS facade
	"cmsSiteTenants",
	// TC-BUILD-3 as-built amendment: catalog dispatch idempotency table
	"catalog_idempotency",
] as const;

const PROVENANCE_FIELDS = [
	"created_by",
	"created_at",
	"updated_by",
	"updated_at",
	"source",
	"source_ref",
	"schema_version",
	"company_id",
] as const;

// Every table except assembly_usages (no PK prefix per §22.1), the
// preserved contractorOsMemberships, and cmsSiteTenants (TC-SEC-01 mapping
// table: siteIdentifier + by_site/by_tenant, no business key) carries key +
// by_key.
const TABLES_WITHOUT_BUSINESS_KEY = new Set([
	"assembly_usages",
	"contractorOsMemberships",
	"cmsSiteTenants",
]);

function tableNames(): string[] {
	return Object.keys(schema.tables);
}

function fieldNames(table: string): string[] {
	// biome-ignore lint/suspicious/noExplicitAny: Convex validator internals
	const validator = (schema.tables as any)[table].validator;
	return Object.keys(validator.fields);
}

function indexNames(table: string): string[] {
	// biome-ignore lint/suspicious/noExplicitAny: Convex TableDefinition experimental API
	const indexes = (schema.tables as any)[table][" indexes"]() as {
		indexDescriptor: string;
		fields: string[];
	}[];
	return indexes.map((i) => i.indexDescriptor);
}

describe("TC-BUILD-1 schema", () => {
	it("defines every expected table", () => {
		const names = tableNames();
		for (const t of EXPECTED_TABLES) {
			expect(names, `missing table ${t}`).toContain(t);
		}
		expect(names.length).toBe(EXPECTED_TABLES.length);
	});

	it("every table carries the 8-field provenance block", () => {
		for (const t of EXPECTED_TABLES) {
			if (t === "contractorOsMemberships") continue; // preserved verbatim
			const fields = fieldNames(t);
			for (const f of PROVENANCE_FIELDS) {
				expect(fields, `${t} missing provenance field ${f}`).toContain(f);
			}
		}
	});

	it("every prefixed table has key + by_key index", () => {
		for (const t of EXPECTED_TABLES) {
			if (TABLES_WITHOUT_BUSINESS_KEY.has(t)) continue;
			const fields = fieldNames(t);
			expect(fields, `${t} missing key field`).toContain("key");
			const indexes = indexNames(t);
			expect(indexes, `${t} missing by_key index`).toContain("by_key");
		}
	});

	it("assembly_usages uses assembly_key/assembly_version (no PK prefix)", () => {
		const fields = fieldNames("assembly_usages");
		expect(fields).toContain("assembly_key");
		expect(fields).toContain("assembly_version");
		expect(fields).not.toContain("key");
	});

	it("contractorOsMemberships is preserved unchanged", () => {
		const fields = fieldNames("contractorOsMemberships");
		expect(fields).toContain("tokenIdentifier");
		expect(fields).toContain("tenantId");
		expect(fields).toContain("enabled");
		expect(fields).toContain("role");
		const indexes = indexNames("contractorOsMemberships");
		expect(indexes).toContain("by_identity");
	});
});
