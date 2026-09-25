import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server.js";
import { internalMutation } from "./_generated/server.js";

// TC-DEMO-01: fenced demo-only seed/reset module. Never client-callable
// (internalMutation only). All records carry company_id "co_demo" and
// source "demo-seed" (leads use source_ref since their `source` field is a
// channel union). Reset deletes ONLY demo-seed records.
//
// All identities are fictional: 555-01XX phones, @example.com emails,
// fictional Twin Cities street addresses. Never real customers.

const CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_DEMO_DATA";
const DEMO_COMPANY = "co_demo";
const DEMO_SOURCE = "demo-seed";

const countsValidator = v.object({
	leads: v.number(),
	estimates: v.number(),
	estimate_lines: v.number(),
	jobs: v.number(),
	job_phases: v.number(),
	invoices: v.number(),
	change_orders: v.number(),
});

const DEMO_TABLES = [
	"leads",
	"estimates",
	"estimate_lines",
	"jobs",
	"job_phases",
	"invoices",
	"change_orders",
] as const;

function assertConfirmation(value: string): void {
	if (value !== CONFIRMATION) {
		throw new Error(
			`demo: refusing to write without confirmation — pass confirmation: "${CONFIRMATION}"`,
		);
	}
}

function daysAgo(days: number): string {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function prov(createdDaysAgo: number) {
	const ts = daysAgo(createdDaysAgo);
	return {
		created_by: "system",
		created_at: ts,
		updated_by: "system",
		updated_at: ts,
		source: DEMO_SOURCE,
		source_ref: "tc-demo-01",
		schema_version: 1,
		company_id: DEMO_COMPANY,
	};
}

async function wipeDemoData(ctx: MutationCtx): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const table of DEMO_TABLES) {
		const docs = (await ctx.db.query(table).collect()).filter(
			(d) => d.company_id === DEMO_COMPANY,
		);
		for (const doc of docs) {
			await ctx.db.delete(doc._id);
		}
		counts[table] = docs.length;
	}
	return counts;
}

// ── Seed data ─────────────────────────────────────────────────────────────
// 12 leads across 10 pipeline stages. All fictional.

type LeadSeed = {
	key: string;
	title: string;
	source: "web_form" | "phone" | "referral" | "portal" | "walk_in" | "other";
	stage:
		| "Prospect"
		| "Outreach Sent"
		| "Reply Received"
		| "Qualifying"
		| "Site Visit Scheduled"
		| "Scope In Progress"
		| "Proposal Sent"
		| "Bid Submitted"
		| "Awarded"
		| "Won"
		| "On Hold"
		| "Disqualified"
		| "Lost";
	contact_name: string;
	contact_phone: string;
	contact_email: string;
	notes: string;
	daysAgo: number;
};

const LEADS: LeadSeed[] = [
	{
		// PM hard requirement (demo script Act 2): exact fictional details.
		key: "lead_demo_01",
		title: "Exterior siding repaint — 4521 Xerxes Ave S, Minneapolis",
		source: "web_form",
		stage: "Prospect",
		contact_name: "Holly Rasmussen",
		contact_phone: "555-0142",
		contact_email: "holly.rasmussen@example.com",
		notes:
			"called from the website estimate form Tuesday; wants it done before first snow. " +
			"Job: exterior siding repaint, peeling on the south side. " +
			"Address: 4521 Xerxes Ave S Minneapolis",
		daysAgo: 2,
	},
	{
		key: "lead_demo_02",
		title: "Interior whole-house repaint — 7890 Portland Ave S, Bloomington",
		source: "phone",
		stage: "Prospect",
		contact_name: "David Okafor",
		contact_phone: "555-0103",
		contact_email: "david.okafor@example.com",
		notes:
			"Saw the yard sign on the Elm Creek job. Wants the full interior done " +
			"before the holidays. Two stories, about 2,400 sq ft. Walk the prep first — " +
			"paint is the last thing we do.",
		daysAgo: 5,
	},
	{
		key: "lead_demo_03",
		title: "Kitchen cabinet refinishing — 2345 Grand Ave S, St. Paul",
		source: "referral",
		stage: "Outreach Sent",
		contact_name: "Maria Santos",
		contact_phone: "555-0117",
		contact_email: "maria.santos@example.com",
		notes:
			"Referred by the Andersons. Sent the intro text with the cabinet process " +
			"photos. Waiting on a reply.",
		daysAgo: 8,
	},
	{
		key: "lead_demo_04",
		title: "Exterior trim and fascia — 5678 Lyndale Ave S, Minneapolis",
		source: "web_form",
		stage: "Reply Received",
		contact_name: "James Whitfield",
		contact_phone: "555-0129",
		contact_email: "james.whitfield@example.com",
		notes:
			"Replied to the follow-up. Wants trim, fascia, and the front door. Asked " +
			"about lead-safe prep on the 1920s siding — send the RRP one-pager.",
		daysAgo: 12,
	},
	{
		key: "lead_demo_05",
		title: "Main-level repaint — 1234 Summit Ave, St. Paul",
		source: "phone",
		stage: "Qualifying",
		contact_name: "Susan Park",
		contact_phone: "555-0133",
		contact_email: "susan.park@example.com",
		notes:
			"Qualifying: 1,800 sq ft main level, walls and ceilings. Timeline is flexible. " +
			"Budget not discussed yet — feel it out on the walkthrough.",
		daysAgo: 15,
	},
	{
		key: "lead_demo_06",
		title: "Basement finishing paint — 9012 France Ave S, Edina",
		source: "referral",
		stage: "Qualifying",
		contact_name: "Robert Chen",
		contact_phone: "555-0148",
		contact_email: "robert.chen@example.com",
		notes:
			"Qualifying: basement drywall just finished. Needs primer plus two coats " +
			"throughout. GC wants us in next month — confirm the drywall is actually ready.",
		daysAgo: 18,
	},
	{
		key: "lead_demo_07",
		title: "Exterior full repaint — 3456 Penn Ave S, Minneapolis",
		source: "web_form",
		stage: "Site Visit Scheduled",
		contact_name: "Linda Kowalski",
		contact_phone: "555-0152",
		contact_email: "linda.kowalski@example.com",
		notes:
			"Walkthrough Thursday 10am. Peeling on the cedar siding, some rot at the " +
			"water table. Bring the moisture meter and the ladder.",
		daysAgo: 21,
	},
	{
		key: "lead_demo_08",
		title: "Commercial office repaint — 789 Industrial Blvd, Minneapolis",
		source: "phone",
		stage: "Scope In Progress",
		contact_name: "Michael Torres",
		contact_phone: "555-0161",
		contact_email: "michael.torres@example.com",
		notes:
			"Scoping: 12,000 sq ft office, nights and weekends only. Measuring this week. " +
			"Waiting on the GC's phasing schedule before we price it.",
		daysAgo: 26,
	},
	{
		key: "lead_demo_09",
		title: "Interior repaint — 234 Summit Ave, St. Paul",
		source: "referral",
		stage: "Proposal Sent",
		contact_name: "Jennifer Adams",
		contact_phone: "555-0174",
		contact_email: "jennifer.adams@example.com",
		notes:
			"Proposal sent Friday. $999 for the main-level walls. Waiting on the yes. " +
			"Follow up Wednesday if quiet.",
		daysAgo: 31,
	},
	{
		key: "lead_demo_10",
		title: "Exterior repaint — 6789 Washburn Ave S, Minneapolis",
		source: "portal",
		stage: "Bid Submitted",
		contact_name: "William Foster",
		contact_phone: "555-0186",
		contact_email: "william.foster@example.com",
		notes:
			"Bid submitted through the portal. $2,499 for siding and trim. " +
			"Decision by end of month.",
		daysAgo: 35,
	},
	{
		key: "lead_demo_11",
		title: "Whole-house interior — 1234 Beard Ave S, Minneapolis",
		source: "phone",
		stage: "Awarded",
		contact_name: "Patricia Nguyen",
		contact_phone: "555-0191",
		contact_email: "patricia.nguyen@example.com",
		notes:
			"Awarded. $4,800 for the full interior. Waiting on the signed contract " +
			"to lock the start date.",
		daysAgo: 40,
	},
	{
		key: "lead_demo_12",
		title: "Exterior and deck — 567 Nicollet Ave S, Burnsville",
		source: "referral",
		stage: "Won",
		contact_name: "Thomas Becker",
		contact_phone: "555-0112",
		contact_email: "thomas.becker@example.com",
		notes:
			"Won. $6,200. Siding, trim, and the deck. Crew is on site — this is the " +
			"active job.",
		daysAgo: 14,
	},
];

type EstimateSeed = {
	key: string;
	leadKey: string;
	version: number;
	status: "draft" | "anthony_review" | "approved" | "superseded";
	baseTotalCents: number;
	markupPct: number;
	marginPct: number;
	daysAgo: number;
	lines: Array<{
		key: string;
		costCode: string;
		description: string;
		quantity: number;
		unit: string;
		extendedCents: number;
	}>;
};

const ESTIMATES: EstimateSeed[] = [
	{
		key: "est_demo_01",
		leadKey: "lead_demo_09",
		version: 1,
		status: "approved",
		baseTotalCents: 99900,
		markupPct: 15,
		marginPct: 32,
		daysAgo: 30,
		lines: [
			{
				key: "estl_demo_01",
				costCode: "09 91 00-L",
				description: "Interior wall prep and paint — main level, two coats",
				quantity: 1,
				unit: "lot",
				extendedCents: 65000,
			},
			{
				key: "estl_demo_02",
				costCode: "09 91 00-M",
				description: "Paint and sundries — main level",
				quantity: 1,
				unit: "lot",
				extendedCents: 20000,
			},
			{
				key: "estl_demo_03",
				costCode: "09 91 00-L",
				description: "Ceiling refresh — main level",
				quantity: 1,
				unit: "lot",
				extendedCents: 14900,
			},
		],
	},
	{
		key: "est_demo_02",
		leadKey: "lead_demo_10",
		version: 1,
		status: "anthony_review",
		baseTotalCents: 249900,
		markupPct: 15,
		marginPct: 35,
		daysAgo: 34,
		lines: [
			{
				key: "estl_demo_04",
				costCode: "09 91 13-L",
				description: "Siding prep — scrape, sand, caulk, spot-prime",
				quantity: 1,
				unit: "lot",
				extendedCents: 120000,
			},
			{
				key: "estl_demo_05",
				costCode: "09 91 13-L",
				description: "Siding finish coats — spray and back-roll, two coats",
				quantity: 1,
				unit: "lot",
				extendedCents: 90000,
			},
			{
				key: "estl_demo_06",
				costCode: "09 91 13-M",
				description: "Exterior paint, primer, and sundries",
				quantity: 1,
				unit: "lot",
				extendedCents: 39900,
			},
		],
	},
	{
		key: "est_demo_03",
		leadKey: "lead_demo_11",
		version: 1,
		status: "approved",
		baseTotalCents: 480000,
		markupPct: 15,
		marginPct: 38,
		daysAgo: 39,
		lines: [
			{
				key: "estl_demo_07",
				costCode: "09 91 00-L",
				description: "Full interior walls — two coats throughout",
				quantity: 1,
				unit: "lot",
				extendedCents: 280000,
			},
			{
				key: "estl_demo_08",
				costCode: "09 91 00-L",
				description: "Ceilings and trim — full house",
				quantity: 1,
				unit: "lot",
				extendedCents: 120000,
			},
			{
				key: "estl_demo_09",
				costCode: "09 91 00-M",
				description: "Interior paint, primer, and sundries",
				quantity: 1,
				unit: "lot",
				extendedCents: 80000,
			},
		],
	},
];

/**
 * Seed the demo dataset. Reset-then-write: safe to run twice, never duplicates.
 * Requires confirmation — this writes demo data to the target deployment.
 */
export const seed = internalMutation({
	args: { confirmation: v.string() },
	returns: countsValidator,
	handler: async (ctx, args) => {
		assertConfirmation(args.confirmation);
		await wipeDemoData(ctx);

		// Leads
		for (const lead of LEADS) {
			await ctx.db.insert("leads", {
				...prov(lead.daysAgo),
				key: lead.key,
				title: lead.title,
				source: lead.source,
				source_ref: DEMO_SOURCE,
				contact_name: lead.contact_name,
				contact_phone: lead.contact_phone,
				contact_email: lead.contact_email,
				client_name: lead.contact_name,
				notes: lead.notes,
				stage: lead.stage,
			});
		}

		// Estimates + lines
		for (const est of ESTIMATES) {
			await ctx.db.insert("estimates", {
				...prov(est.daysAgo),
				key: est.key,
				version: est.version,
				status: est.status,
				base_total_cents: est.baseTotalCents,
				alternates: [],
				exclusions: [],
				markup_pct: est.markupPct,
				margin_pct: est.marginPct,
				lead_id: est.leadKey,
			});
			for (const line of est.lines) {
				await ctx.db.insert("estimate_lines", {
					...prov(est.daysAgo),
					key: line.key,
					estimate_id: est.key,
					cost_code: line.costCode,
					quantity: line.quantity,
					unit: line.unit,
					epistemic: "measured",
					extended_cost_cents: line.extendedCents,
				});
			}
		}

		// Jobs: one in production (active), one scheduled
		await ctx.db.insert("jobs", {
			...prov(10),
			key: "job_demo_01",
			status: "in_production",
			contract_value_cents: 620000,
		});
		await ctx.db.insert("jobs", {
			...prov(38),
			key: "job_demo_02",
			status: "scheduled",
			contract_value_cents: 480000,
		});

		// Phases on the active job
		const phases: Array<{
			key: string;
			type:
				| "mobilization"
				| "prep"
				| "coats"
				| "cleanup"
				| "rework"
				| "callback";
			minutes: number;
			days: number;
		}> = [
			{ key: "jph_demo_01", type: "mobilization", minutes: 120, days: 10 },
			{ key: "jph_demo_02", type: "prep", minutes: 960, days: 9 },
			{ key: "jph_demo_03", type: "coats", minutes: 1200, days: 7 },
			{ key: "jph_demo_04", type: "cleanup", minutes: 240, days: 3 },
		];
		for (const phase of phases) {
			await ctx.db.insert("job_phases", {
				...prov(phase.days),
				key: phase.key,
				job_id: "job_demo_01",
				phase_type: phase.type,
				planned_hours_min: phase.minutes,
			});
		}

		// Change order against the active job
		await ctx.db.insert("change_orders", {
			...prov(5),
			key: "co_demo_01",
			job_id: "job_demo_01",
			status: "approved",
			directed_by: "Thomas Becker",
			price_cents: 85000,
			approved_by: "Thomas Becker",
			approved_at: daysAgo(4),
		});

		// Invoices against the active job: paid, sent, overdue
		await ctx.db.insert("invoices", {
			...prov(9),
			key: "inv_demo_01",
			job_id: "job_demo_01",
			status: "paid",
			amount_cents: 310000,
		});
		await ctx.db.insert("invoices", {
			...prov(6),
			key: "inv_demo_02",
			job_id: "job_demo_01",
			status: "sent",
			amount_cents: 310000,
		});
		await ctx.db.insert("invoices", {
			...prov(20),
			key: "inv_demo_03",
			job_id: "job_demo_01",
			change_order_id: "co_demo_01",
			status: "overdue",
			amount_cents: 85000,
		});

		return {
			leads: LEADS.length,
			estimates: ESTIMATES.length,
			estimate_lines: ESTIMATES.reduce((n, e) => n + e.lines.length, 0),
			jobs: 2,
			job_phases: phases.length,
			invoices: 3,
			change_orders: 1,
		};
	},
});

/**
 * Delete ONLY demo-seed records. Returns per-table delete counts.
 * Requires confirmation.
 */
export const reset = internalMutation({
	args: { confirmation: v.string() },
	returns: countsValidator,
	handler: async (ctx, args) => {
		assertConfirmation(args.confirmation);
		const wiped = await wipeDemoData(ctx);
		return {
			leads: wiped.leads ?? 0,
			estimates: wiped.estimates ?? 0,
			estimate_lines: wiped.estimate_lines ?? 0,
			jobs: wiped.jobs ?? 0,
			job_phases: wiped.job_phases ?? 0,
			invoices: wiped.invoices ?? 0,
			change_orders: wiped.change_orders ?? 0,
		};
	},
});
