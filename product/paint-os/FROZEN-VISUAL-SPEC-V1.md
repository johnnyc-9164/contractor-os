# Painter OS — frozen visual milestone V1

**Status:** frozen product/design contract, V1.1 (review amendment 2026-09-28). **Applies to:** the authenticated painting contractor workspace. **Acceptance target:** `/dashboard` and `/pipeline`, the shared shell, and access to existing lead routes. `/customers` and `/jobs` are follow-on surfaces and do not gate V1. This is a specification of intended work, not a claim that routes or integrations have shipped.

## Source of truth and precedence

The user-supplied expanded `stitch_paintpro_business_os.zip` is the visual source, SHA-256 `e39cd332484e6942a2f760431a594df450c9c0cdd9624b55aae2f69b139c1801`; it contains 65 `code.html` files and 65 `screen.png` files. The separate `PaintPro_Updated_Target_Map.zip` is an index, SHA-256 `de06a8bf43f7e1938b3892269a696468df6a6c2b48c6df4531b4c621ce13c129`. Another Library copy named `stitch_paintpro_business_os.zip` has SHA `3c25d9e0d2f3c2a700c86e21c03594e15ff0475e4b95f1bd4ab0f572a718176a` and only 39 HTML files; it is **not** the expanded archive. Check the hash before declaring reference coverage.

Source paths below are relative to the expanded archive's `stitch_paintpro_business_os/` directory. Screenshots define visual composition, hierarchy, and interaction placement; HTML is a secondary inspection aid. Neither screenshot nor HTML proves an operational backend. The target map's recommended references are *proposals* for all 18 families. This milestone selects two of those recommendations as the strongest shared office UI anchors. Existing repo `DESIGN.md` still describes the neutral temporary theme; the selected PaintPro direction is the proposed visual update in PR #95. Land its tokens and update the design guidance before enforcing exact color comparisons.

| Anchor | Screenshot SHA-256 | Contract |
| --- | --- | --- |
| `paintpro_os_executive_command_center_2/screen.png` | `a27d9d13f30c61ec2428b17e7cb6dbe5e22cddbe593e2bff36f29c78ac6e86ac` | Authenticated shell, dashboard hierarchy, card/table rhythm; **not** its speculative AI or finance data |
| `paintpro_os_crm_lead_pipeline_2/screen.png` | `f7ca731868bd709ef35dd26f4e2d6e232c62f7f4c739bf85e0cb796069f51ec6` | Pipeline board, filters, contextual lead panel; **not** its AI scores, SMS, maps, or invented activity |
| `paintpro_os_unified_operations_dashboard/screen.png` | `522edce55d5e40733948f60db27be1db375ac31e263b5b2ea48338fe81b5063b` | Simpler fallback for a dashboard when the executive screen suggests unsupported analytics |
| `paintpro_os_unified_leads_pipeline/screen.png` | `34b32b6976ae2bf8b7b72602f076a1203154acb38d0d41eda89c55e05375b86c` | Simpler fallback for the board and selected lead; use the shared sans UI, not this screen's serif text |

The 65 screens are the longer-term reference inventory, not a requirement to ship 65 routes in V1. Public painting website, customer portal, technician time tracking, inventory, billing automation, multi-channel communications, AI assistant, and platform administration each require their own contract and data proof.

## V1 surface and route contract

Keep existing real URL paths: the Next.js `(app)` route group adds no `/app` prefix. Do not rename Painter OS in code without a separate product naming decision; the reference artwork says PaintPro OS, while the current repo calls itself Contractor OS.

| Surface | Route | Visible acceptance | Data boundary |
| --- | --- | --- | --- |
| Shared operator shell | V1: `/dashboard`, `/pipeline`, `/leads` and `/leads/[id]`; later: added operator routes | Light sidebar with active item, compact top utility area, one cobalt primary action, page title and clear content grid. At narrow widths a menu replaces the fixed sidebar. Navigation targets only real, authorized routes. | Authenticated tenant context; no cross-tenant records in counts, search, links, or panels. |
| Overview | `/dashboard` | Executive screenshot's title/time context, top summary region, primary work region, recent leads/jobs. Show only supported metrics; a list or empty explanation occupies a chart/insights slot until reliable measures exist. | Existing live leads/jobs queries; totals cannot be inferred from one page of 20 records. Revenue, win rate, crew utilization and forecasts require separately verified aggregate queries and definitions. |
| Pipeline | `/pipeline` | CRM screenshot's horizontally navigable stages and lead cards, filters, selected lead context; card selection yields a usable detail path or panel. Existing `/leads` and `/leads/[id]` stay reachable. | Server-authorized lead records and legitimate lifecycle transitions only. AI score, transcript, SMS status and map are omitted until backed by an actual service and accessible fields. |
| Follow-on customers and jobs (outside V1 acceptance) | `/customers`, `/jobs`, optional `/jobs/[id]` when backed by a real detail query | Shared shell and visual grammar: readable lists/tables, status, primary creation/view action and useful empty states. These are supporting work surfaces, not pixel replicas of a customer portal or field technician app. | Ship each new route only with real scoped read/query data, permissions and functional actions. Until then navigation does not pretend the route exists. |

No mock business names, dollar values, charts, avatar photos, third-party logos, customer messages, delivered indicators, or conversion rates from reference screenshots may appear as operational facts. Sample records may be used only in an explicitly labeled local fixture or design test.

## Frozen visual rules

1. **Shell:** neutral or pale gray page canvas; white or near-white content panels; visible dividers and restrained shadows. Desktop sidebar target 256–280 px; body region max width about 1440 px with 24–32 px desktop gutters. The shell remains consistent on dashboard and pipeline. The executive and CRM screenshots show a much wider sidebar at their capture dimensions; use the responsive target rather than hard coding its pixels.
2. **Color:** cobalt marks active navigation, focused control and primary action. Implement semantic tokens proposed in PR #95: background `#f7f9fb`, card `#ffffff`, foreground `#191c1e`, primary `#003ec7`, ring `#004ced`, accent `#dde1ff`, muted `#f2f4f6`, destructive `#ba1a1a`. Provide dark-mode equivalents with contrast checked; feature code uses semantic classes, not copied screenshot hex values.
3. **Type and density:** Inter Variable or the existing compatible sans stack; no serif in shared operator UI. Strong page title, compact section titles, 4 px spacing unit, 16/24/32 px common gutters. Table rows and cards may wrap; do not clip names, money or status to imitate screenshot density.
4. **Composition:** at desktop width, dashboard summary cards precede the work list; pipeline board occupies the main region and selected-lead context sits alongside when room permits. Keep one clear primary action per region. Reuse shared primitives, with product adapters performing Convex calls; optional registry components require inspection before adoption.
5. **Responsive:** verify at 1440×900, 768×1024 and 390×844. Main page never causes sideways scrolling on a phone. Pipeline columns may scroll within an explicitly labeled board region; lead details stack or open as an accessible sheet. Primary touch targets are at least 44×44 px.
6. **States:** every shipped surface has loading, genuinely empty, recoverable error, denied, and populated states. Status uses text as well as color; focus is visible, keyboard navigation and screen-reader labels remain useful. Filters expose and clear their state; pagination or continuation works when more records exist.

## Definition of done and release boundary

- At the three specified viewports, compare **layout hierarchy, typography, spacing and emphasis** against the two primary screenshot anchors. Screenshot comparison is an evidence artifact with a short list of remaining mismatches; it is not a claim of pixel equivalence for missing features.
- In a signed-in test tenant, dashboard and pipeline load real persisted records, creation and supported transitions survive reload, and every displayed count matches its defined query scope. In a second tenant, the first tenant's records and aggregates remain inaccessible. Verify unauthorized and empty states. Seed over 100 leads with tenant records interleaved, then verify stage totals, filtering and continuation against the complete authorized set; a first-page-only result must never masquerade as the total.
- Exercise the auth/membership route matrix for `/dashboard`, `/pipeline`, `/leads` and `/leads/[id]`: signed out redirects or presents sign-in without records; signed in without an enabled tenant membership sees no operator data or actions; signed in with enabled membership sees only that tenant's records. In particular `/dashboard` is currently outside `(app)` and does not inherit its `MembershipProvider`, while `proxy.ts` currently protects only `/dashboard` and `/leads`. Before shipping any `/customers`, `/jobs` or `/jobs/[id]` route, extend the appropriate middleware/provider/data guards and repeat this matrix on each route. Hiding navigation is not authorization.
- Route navigation, menu, filters, board selection and every enabled button have working outcomes. Unsupported actions are absent or visibly unavailable with truthful copy. Keyboard, focus, phone layout and light/dark contrast are checked in a browser.
- Final implementation commits pass repo typecheck, lint, tests, authoritative production build, full CI and a READY Vercel preview. Authenticate the preview for the behavioral and screenshot checks. A preview screenshot alone is not production readiness.
- Production rollout additionally needs the separate auth/configuration, backend isolation, deployment and live smoke gates. Completion of this visual milestone does not declare the 65-screen product complete or production-ready.

**Suggested order, without assigning time estimates:** land PR #95 visual tokens/design guidance; integrate dashboard PR #92 and pipeline PR #93 against the shared shell and route matrix; gather one integrated, authenticated visual comparison and data proof to close V1. Then add jobs PR #98 and customers PR #97 after real read paths and their route access tests are demonstrated. PR numbers identify in-flight work as of this freeze, not merged facts. Avoid concurrent edits to their claimed files.

## Change control

Treat the chosen anchors, V1 routes, truthfulness rules, and acceptance criteria above as fixed for implementation. A change needs an explicit dated amendment in this file recording the new scope, the reason and its evidence, plus a version bump. Do not silently broaden V1 to all 65 screens or copy speculative screenshot features into product requirements. Route availability and third-party capability remain conditional on verified implementation evidence.

| Amendment | Reason and evidence | Scope change |
| --- | --- | --- |
| 2026-09-28, V1 → V1.1 | Independent PR #114 review found unguarded pipeline and future routes (`apps/web/src/proxy.ts`), dashboard outside membership layout, and board queries limited to 100 leads (`pipeline-board.tsx`). | Make dashboard/pipeline the V1 gate, defer customers/jobs, and require route-matrix plus >100-record pagination/isolation proof. |
