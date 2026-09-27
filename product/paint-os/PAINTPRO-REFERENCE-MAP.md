# PaintPro reference map for Painter OS

Status: product-source audit for issue #50. This is a docs-only map, not an implementation or design-system migration.

## Evidence boundary

- Contractor OS base: `f799616c29873812d3db48fac9f3ff67f1c4044f` (`master`, observed 2026-09-27).
- Supplied wrapper archive: `PaintPro_Source_Kit(2).zip`, SHA-256 `1beb0d04b5f6e1ec66088fdcc69f77f163040cf10c9892ac3fbddfdc36ffb79f`.
- The kit records its original `flat_paintpro.zip` source archive as SHA-256 `413a16b5428f720b73cc6f384e87bc3cc4a556d7c00c06d7b488cbcee6880bed` in `manifest/screens.json`.
- Kit facts: 39 HTML exports, 38 screenshots, 38 converted TSX screens, 14 recommended primary screens, 24 complete alternatives and one incomplete export.
- Kit verification proves source conversion checks only. It does not prove shadcn installation, semantic application typechecking, React rendering, Convex persistence, authentication, authorization, payments or deployment. See `README.md`, `docs/SOURCE_AUDIT.md` and `verification/SUMMARY.json` in the kit.
- Repository evidence is source inspection at the exact base SHA. No authenticated Preview journey was run for this document.

Status terms used below:

- **Present**: a matching capability exists in the current app and uses live application data, although PaintPro visual fidelity may still be pending.
- **Partial**: some route, component, model or mutation exists, but the end-to-end user outcome is not complete or proven.
- **Missing**: no usable end-to-end capability exists. A nearby schema field, static mockup or generic mutation does not make the capability present.

## Product and audience boundary

The kit is not one application shell. It contains four audiences that must stay separate.

| Audience | Primary references | Current repository evidence | Boundary |
| --- | --- | --- | --- |
| Painting prospect or customer | S03, S10, S11, S38 | `apps/marketing/`; no `/estimate` or `/portal/**` routes in `apps/web/src/app/` | Public acquisition, booking, project visibility, invoice and payment handoff. Never expose operator data or accept a client-supplied tenant as authority. |
| Painting business operator | S12, S31, S32, S34, S35, S36, S37, S39 | `apps/web/src/app/(app)/`, `apps/web/src/components/`, `packages/backend/convex/` | Authenticated daily work surface. This is the audience currently governed by root `DESIGN.md`. |
| PaintPro platform operator | S17 | No platform route or platform-role surface | Cross-business branding/administration is a separate privileged surface, not an owner setting disguised by a route parameter. |
| PaintPro software buyer | S24 | `apps/marketing/src/components/hero.tsx` markets software, while `pricing.tsx` shows painting-job prices | Separate product-marketing domain. The current marketing app mixes software-buyer and painting-customer copy and cannot be treated as an approved owner for either audience. |

## Reconcile the PaintPro target with `DESIGN.md`

The source kit is now the product and visual target, but it does not silently repeal the existing design contract.

1. Root `DESIGN.md` remains authoritative for the current authenticated operator surface until an explicit design-decision change is reviewed. Its neutral semantic tokens, operational voice, accessibility rules and shadcn-first component rule remain valid.
2. The kit supplies layout, information hierarchy, interaction seams and visual reference evidence. Its shared CSS and 47-color source palette are not approved as a wholesale replacement for `packages/ui/src/styles/globals.css`.
3. The `DESIGN.md` statement "not a marketing site" applies to the operator work surface. S38 customer acquisition and S24 software sales belong to separate public surfaces, so they do not justify marketing sections inside the operator app.
4. PaintPro styling should be introduced through semantic, surface-scoped tokens after a brand decision. Do not paste screen-specific colors into shared primitives or create a second global design system.
5. The kit's proposed `/app/**` routes are recommendations. The current route group `(app)` does not add `/app` to the URL; preserve `/leads`, `/pipeline`, `/quotes/new` and `/dashboard` unless a reviewed route migration says otherwise.
6. S36 is the first safe visual pilot: retain the live `PipelineBoard` and `LeadDrawer` as the data-owning feature components and use S36's `kanban-board` and `lead-details` slots as composition seams. Do not replace live Convex behavior with kit sample records.

This reconciliation is deliberately non-destructive: no product code, shared tokens or root design policy changes are included here.

## Fourteen primary screen references

All paths in the Kit evidence column are relative to `PaintPro_Source_Kit/`.

| ID | Audience and target route | Kit evidence | Current repository match | Status and gap |
| --- | --- | --- | --- | --- |
| S03 Booking assistant | Customer, `/estimate` | `originals/ai_booking_assistant_paintpro_os__code.html`; `originals/ai_booking_assistant_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S03.tsx` | No matching route. `apps/web/src/components/CreateLeadForm.tsx` is operator-only and does not book availability. | **Missing.** Contact capture, availability, booking result and persistence need a public, tenant-resolved flow. |
| S10 Customer invoice | Customer, `/portal/invoices/:invoiceId` | `originals/client_invoice_view_paintpro_os__code.html`; `originals/client_invoice_view_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S10.tsx` | `apps/web/src/components/CreateInvoiceForm.tsx`; `packages/backend/convex/backend.ts`; `packages/backend/convex/schema.ts` | **Missing as a customer screen.** Operator invoice creation and an invoice table are not an authorized invoice document or verified payment handoff. |
| S11 Customer portal | Customer, `/portal/projects/:projectId` | `originals/client_portal_paintpro_os__code.html`; `originals/client_portal_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S11.tsx` | No `/portal/**` route. Job, event and artifact-adjacent records exist in `packages/backend/convex/schema.ts`. | **Missing.** Project progress, schedule, photos and messages need a customer authorization model and bounded projections. |
| S12 Quote editor | Owner, proposed `/app/quotes/new` | `originals/create_new_quote_paintpro_os__code.html`; `originals/create_new_quote_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S12.tsx` | `apps/web/src/app/(app)/quotes/new/page.tsx`; `apps/web/src/components/quotes/quote-wizard.tsx`; `apps/web/src/components/quotes/schemas.ts`; `packages/backend/convex/estimate.ts` | **Partial.** The UI calls the wrong generated API namespace and sends only lead and amount to `lead.sendProposal`; the catalog requires an approved persisted `estimate_version_id`. See #83 then #77. |
| S17 Business branding | Platform, `/platform/businesses/:businessId/branding` | `originals/developer_sales_portal_paintpro_os__code.html`; `originals/developer_sales_portal_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S17.tsx` | No platform route. `packages/backend/convex/cms.ts` is adjacent site infrastructure, not a platform branding workflow. | **Missing.** Requires explicit platform role, server-derived business ownership, preview/save/revert semantics and deployment truth. |
| S24 Software sales | Software buyer, separate product `/` | `originals/high_conversion_landing_page_with_blog_paintpro_os__code.html`; `originals/high_conversion_landing_page_with_blog_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S24.tsx` | `apps/marketing/src/app/page.tsx`; `apps/marketing/src/components/hero.tsx`; `apps/marketing/src/components/pricing.tsx` | **Partial and audience-ambiguous.** Software headline and painting-service prices currently share one surface. Split the audience before fidelity work. |
| S31 Billing settings | Owner, proposed `/app/settings/billing` | `originals/paintpro_os_unified_billing_settings__code.html`; `originals/paintpro_os_unified_billing_settings__screen.png`; `packages/paintpro-designs/src/screens/S31.tsx` | No settings route or persisted billing preferences. Invoice/payment records in `packages/backend/convex/schema.ts` are transactional, not settings. | **Missing.** Provider choice, reminders and defaults must have explicit persistence and observed connection state. |
| S32 Content editor | Owner, proposed `/app/content` | `originals/paintpro_os_unified_blog_editor__code.html`; `originals/paintpro_os_unified_blog_editor__screen.png`; `packages/paintpro-designs/src/screens/S32.tsx` | No content route. `packages/backend/convex/cms.ts` and vendored CMS provide partial backend infrastructure. | **Partial backend only.** Needs tenant-safe draft, preview and publish semantics; #59 and #64 are prerequisite CMS repairs. |
| S34 Integration settings | Owner, proposed `/app/settings/integrations` | `originals/paintpro_os_unified_integrations_settings__code.html`; `originals/paintpro_os_unified_integrations_settings__screen.png`; `packages/paintpro-designs/src/screens/S34.tsx` | No settings route. `apps/web/.env.schema`, `packages/backend/convex/auth.config.ts` and `apps/web/src/app/api/health/route.ts` describe configured infrastructure. | **Missing.** Configuration files are not a connection-status UI. Connect/test/disconnect must report observed provider results without exposing secrets. |
| S35 Business knowledge | Owner, proposed `/app/knowledge` | `originals/paintpro_os_unified_knowledge_editor__code.html`; `originals/paintpro_os_unified_knowledge_editor__screen.png`; `packages/paintpro-designs/src/screens/S35.tsx` | No matching route or dedicated service/FAQ/policy API. `packages/backend/convex/schema.ts` contains dossiers and evidence records, which are not the same contract. | **Missing.** Define a bounded knowledge model and authorization before binding the editor. |
| S36 Leads pipeline | Owner, proposed `/app/leads` | `originals/paintpro_os_unified_leads_pipeline__code.html`; `originals/paintpro_os_unified_leads_pipeline__screen.png`; `packages/paintpro-designs/src/screens/S36.tsx` | `apps/web/src/app/(app)/pipeline/page.tsx`; `apps/web/src/app/(app)/leads/page.tsx`; `apps/web/src/components/pipeline/pipeline-board.tsx`; `apps/web/src/components/leads/lead-drawer.tsx`; `packages/backend/convex/catalog.ts` | **Present as a live capability.** PaintPro composition/fidelity, responsive detail behavior and authorized navigation remain; #75 owns navigation and #58 owns the registry pilot. |
| S37 Operations dashboard | Owner, proposed `/app` | `originals/paintpro_os_unified_operations_dashboard__code.html`; `originals/paintpro_os_unified_operations_dashboard__screen.png`; `packages/paintpro-designs/src/screens/S37.tsx` | `apps/web/src/app/dashboard/page.tsx`; `apps/web/src/components/CreateLeadForm.tsx`; `apps/web/src/components/CreateJobForm.tsx`; `apps/web/src/components/CreateInvoiceForm.tsx` | **Partial.** Live lead/job lists and creation mutations exist, but the dashboard is a basic mixed form page, not the operational summary/reference composition. |
| S38 Customer website | Painting customer, `/` | `originals/paintpro_os_unified_premium_landing_page__code.html`; `originals/paintpro_os_unified_premium_landing_page__screen.png`; `packages/paintpro-designs/src/screens/S38.tsx` | `apps/marketing/` contains a public page, but its hero markets software while its pricing section sells paint jobs. `apps/web/src/app/page.tsx` is only an API-status page. | **Partial and audience-ambiguous.** Select the painter-site owner/domain, then connect project intake to the same lead contract as the operator pipeline. |
| S39 Quotes and invoices | Owner, proposed `/app/billing` | `originals/quotes_invoicing_dashboard_paintpro_os__code.html`; `originals/quotes_invoicing_dashboard_paintpro_os__screen.png`; `packages/paintpro-designs/src/screens/S39.tsx` | No billing route. `apps/web/src/components/CreateInvoiceForm.tsx`, `packages/backend/convex/backend.ts` and `packages/backend/convex/schema.ts` provide create/query primitives. | **Partial backend and form only.** Tenant-scoped worklists/details, shared document totals and quote/invoice relationships remain; see #62, #63, #68, #70 and #69. |

### S33 exclusion

`originals/paintpro_os_unified_client_portal_dashboard__code.html` is 1,144 bytes, ends inside a configuration string, has no screenshot and has no generated TSX module. It is preserved as provenance only. Do not repair it by guessing or create `S33.tsx`; use complete S11 as the portal reference.

## Continuous journey gap map

| Journey stage | Status | Kit evidence | Current repository evidence | Exact gap to acceptance |
| --- | --- | --- | --- | --- |
| Lead | **Partial** | S38 customer website, S03 booking, S36 pipeline | `apps/web/src/components/CreateLeadForm.tsx`; `apps/web/src/app/(app)/leads/page.tsx`; `apps/web/src/app/(app)/pipeline/page.tsx`; `packages/backend/convex/lead.ts`; `packages/backend/convex/catalog.ts` | Operator capture and lifecycle work, but public intake/booking, tenant resolution and authenticated Preview persistence are unproved. #47 owns live lead-to-quote verification. |
| Site assessment and estimate/quote | **Partial** | S03 and S12; kit `IMPLEMENT_EXISTING.md` says dedicated assessment/booking results are absent | `apps/web/src/app/(app)/quotes/new/page.tsx`; `apps/web/src/components/quotes/quote-wizard.tsx`; `packages/backend/convex/estimate.ts`; `packages/backend/convex/estimate_engine.ts`; `packages/backend/convex/approvals.ts`; `packages/backend/convex/schema.ts` | No complete assessment record UI. Quote dispatch cannot satisfy the approved-estimate version contract until #83 and #77. Line-item UI values are not a persisted estimate merely because they are rendered. |
| Customer decision | **Missing** | No dedicated design; S11 is the closest customer shell and S12 is operator editing | `packages/backend/convex/schema.ts` defines proposal `accepted`/`declined`; `packages/backend/convex/catalog.ts` exposes operator `lead.award`/`lead.win` | No customer-authorized quote view, accept/decline operation, immutable decision evidence or idempotent job creation/link. A schema enum is not a decision workflow. |
| Job | **Partial** | S37 dashboard and S11 portal; the kit explicitly lacks project detail/work-order design | `apps/web/src/app/dashboard/page.tsx`; `apps/web/src/components/CreateJobForm.tsx`; `packages/backend/convex/backend.ts` exposes `co_create_job`; `packages/backend/convex/schema.ts` defines jobs/phases | Job create/list exists, but no owned jobs worklist/detail, accepted-proposal linkage proof, work order, schedule or reload-tested state. #72 and #71 cover worklist/detail. |
| Crew assignment and schedule | **Missing** | No dedicated primary screen; S11 schedule and S37 operations are adjacent references | `packages/backend/convex/schema.ts` defines crew-role users, job phases and time entries; `packages/backend/convex/backend.ts` exposes `assign_subcontractor` | Subcontractor assignment is not internal crew/resource scheduling. No assignment model/surface, conflict rules or crew-scoped authorization is shown. |
| Field update | **Partial API only** | S11 photos/progress; no dedicated field-update creation design | `packages/backend/convex/backend.ts` exposes `submit_daily_report`; `packages/backend/convex/schema.ts` has artifacts, evidence and event log | No field-facing route, report form, photo upload contract, offline/retry behavior or portal projection has been observed. |
| Customer portal | **Missing** | S11; S10 for invoice detail | No `/portal/**` route under `apps/web/src/app/`; only operator membership/auth surfaces exist | Define customer identity/invite or link policy, tenant/job authorization, bounded projections and access-denied states before composing S11. |
| Invoice | **Partial** | S39 operator billing, S10 customer invoice, S31 settings | `apps/web/src/components/CreateInvoiceForm.tsx`; `packages/backend/convex/backend.ts` exposes `co_create_invoice` and `invoiceBalance`; `packages/backend/convex/schema.ts` has invoice/pay-app/SOV records | No tenant-scoped worklist/detail or shared line-item/document composition. #62, #63, #68, #70 and #69 are the current repair sequence. |
| Verified payment result | **Missing** | S10 payment handoff and S31 provider options; kit explicitly says payment outcomes are absent | `packages/backend/convex/backend.ts` exposes `co_record_payment`; `packages/backend/convex/schema.ts` has `money_events.kind = payment_received` | Recording a payment is not provider verification. There is no provider session/webhook correlation, replay protection, success/failure route or observed provider evidence. Never mark paid from a redirect alone. |

## Cross-cutting blockers and decisions

1. **Generic PaintPro versus Sky's data is unresolved.** The requested target is a generic/white-label Painter OS, but `packages/backend/convex/lead.ts`, `events.ts` and `identity.ts` hard-code `COMPANY_ID = "co_skys"`; `schema.ts` also describes `co_skys` as the default. Before customer, platform or multi-business surfaces ship, company/tenant ownership must be derived from the authenticated membership and tested across at least two tenants. Do not copy Sky's records into PaintPro fixtures.
2. **Preview trust chain is incomplete.** #65 must prove the Preview SHA, #61 must prove signed-in and disabled membership behavior, and #76 must protect product routes and wait for Convex auth readiness. Exact-SHA UI claims depend on those gates.
3. **Issue #50's historical dependency remains open.** #50 says it is blocked by #51. The user explicitly requested product work in parallel, so this analysis can exist as a draft; it does not silently declare the factory proof complete or authorize merge.
4. **Quote contract is known-broken on the inspected SHA.** #83 must expose authorized approved estimate versions; #77 then binds the UI to a real approved version and engine total. Do not weaken backend guards or invent IDs.
5. **CMS isolation repairs precede publishing UI.** #59 and #64 own known create/list tenant-boundary defects in `packages/backend/convex/cms.ts`.
6. **Design direction needs one explicit decision.** Recommended: retain semantic shadcn tokens, approve a PaintPro operator theme scoped to the operator shell, and treat S38/S24/S17 as separate surface themes only when their audience/domain is selected.
7. **Customer auth and payments are product decisions, not styling tasks.** Choose invitation/link/session lifetimes and the payment provider before those flows are accepted; never encode either decision in static TSX.

## Prioritized vertical slices

The order optimizes for one continuous, truthful business journey. Each slice stays independently reviewable and avoids copying the kit wholesale.

| Priority and slice | Prerequisites | Independent lanes | Non-goals | Acceptance evidence |
| --- | --- | --- | --- | --- |
| 0. Trustworthy nonproduction base | #65 exact Preview SHA; #61 Clerk role proof; #76 protected routes/auth readiness; #49 approved development configuration | Deployment checker; auth route/query repair; browser proof | Production changes, new product screens, secret exposure | Same reviewed SHA has green CI/build, matching Preview health SHA, authenticated operator success and anonymous/disabled denial. |
| 1. Lead to approved quote | Keep S36 live pipeline; complete #83, then #77; use S12 as layout reference; #58 may style a disjoint composition seam | Backend approved-estimate read; quote binding/tests; S36 visual composition; #47 browser QA | Public booking, customer acceptance, job creation, global token rewrite | Operator creates/advances a lead, selects an authorized approved estimate version, sends exact engine total, reloads, and sees persisted proposal/version/timeline at the same SHA. |
| 2. Customer decision to linked job | Slice 1; generic tenant boundary; customer identity decision | Customer quote projection/decision API; customer decision UI; idempotent job link; security review | Full portal, crew scheduling, payment | Customer can view only their immutable quote version, accept/decline once, and reload; acceptance links exactly one job and records actor/time/evidence. Cross-tenant and replay tests fail closed. |
| 3. Job to crew to field update | Slice 2; #72/#71 job surfaces; crew assignment model/authorization decision | Job worklist/detail; crew/resource API; schedule UI; daily report/photo path; mobile/offline QA | Invoice/payment, decorative dashboard metrics | Owner assigns an authorized crew without conflict; field user submits an idempotent update with evidence; owner and permitted customer projection show the same persisted progress after reload. |
| 4. Invoice to verified payment | Slice 2 job link; #62, #63, #68, #70, #69; provider and webhook policy | Invoice query/composition; S39 owner UI; S10 customer UI; provider adapter/webhook; finance security QA | Marking paid on redirect, hard-coded amounts, production charges | One job produces one consistent invoice document and balance; test-mode provider result is correlated server-side, replay-safe and visible after reload. Failure/cancel paths never mark paid. |
| 5. Booking and painter website | Audience/domain decision; Slice 1 lead contract; safe public tenant resolution | S38 public composition; S03 contact/availability flow; lead/booking API; conversion/accessibility QA | PaintPro software sales, operator navigation, fake availability | Public customer submits contact and selects genuinely available time; one tenant-owned lead/appointment appears in operator pipeline after reload with source evidence. |
| 6. Knowledge, content and settings | Core journey slices stable; #59/#64; provider/brand decisions | S35 knowledge; S32 CMS; S34 integrations; S31 billing settings; platform S17 in a separately authorized lane | Blocking core lead/job/invoice delivery, static connected badges, deployment claims from previews | Draft/save/reload tests, tenant isolation, explicit preview/publish, and connection tests returning observed status. Each screen has loading, empty, failure and denied states. |
| 7. Software-sales surface | Explicitly separate S24 from S38 and choose product domain/CTA target; #74 Preview CTA evidence | Marketing composition; copy/offer; CTA routing; analytics consent | Painting-customer job pricing on software-sales page, operator functionality | A software buyer understands PaintPro and reaches the configured nonproduction conversion target; no painting-company customer records are mixed into this surface. |

## Integration rules for every slice

- Preserve one Convex backend. UI components receive data and callbacks; authenticated feature boundaries own queries and mutations; server functions own authorization and transitions.
- Use existing shadcn primitives from `@contractor-os/ui` before adding registry components. A dry-run and destination review precede any shadcn registry install. Never use automatic overwrite.
- Import content-only PaintPro exports or adapt small regions. Do not import original navigation into the existing shell and do not copy static business data beside live records.
- Keep the kit's action, field and slot identifiers as migration handles. Unwired controls stay disabled; no no-op handler may produce a success toast.
- All consequential operations need server-derived tenant/company ownership, idempotency where replay matters, explicit loading/failure/denied states and reload persistence proof.
- Desktop and mobile visual comparison use the supplied screenshots as references. The S36 fixed 480px detail panel and S37 280px sidebar require responsive adaptation rather than literal copying.
- Preserve the source archive and alternatives as evidence. Do not turn 24 alternative designs or 593 generated action/link IDs into backlog features.

## Review and completion checklist

- [x] Four audiences separated.
- [x] All 14 recommended primary screens mapped to exact kit and repository paths.
- [x] S33 excluded with S11 named as the complete replacement reference.
- [x] Lead, estimate/quote, customer decision, job, crew, field update, portal, invoice and verified-payment stages marked present/partial/missing.
- [x] Neutral-only `DESIGN.md` reconciled without changing product code or tokens.
- [x] Prioritized slices include prerequisites, independent lanes, non-goals and acceptance evidence.
- [x] Ambiguities and security/tenant dependencies stated instead of guessed.
- [ ] Independent reviewer verifies this document against the exact base SHA and source-kit hash.
- [ ] Issue #51 dependency and the controller's merge gate are resolved before this draft is made merge-ready.
