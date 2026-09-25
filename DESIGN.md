# DESIGN.md — Contractor OS experience design

> Product and experience design: what this product should feel like.
> Project facts belong in `AGENTS.md`; collaboration protocol in `CLAUDE.md`.
> Tokens below are derived from repo evidence
> (`packages/ui/src/styles/globals.css`, shadcn/ui defaults) — nothing invented.

## Design intent

- **Audience:** the contractor's office — the person running leads, jobs, and
  invoices day to day. Not a marketing visitor.
- **Primary experience:** the dashboard. At a glance: what's the pipeline
  (leads), what's the work (jobs), what pays (invoices). Every creation form
  is one screen, one mutation, done.
- **Not this:** a marketing site. No hero sections, no feature grids, no
  "solutions" copy. This is a work surface, not a pitch.

## Color

shadcn/ui default theme (oklch neutrals), light and dark variants in
`packages/ui/src/styles/globals.css`:

- Background: white / near-black; text: near-black / near-white
- Primary: neutral dark (`oklch(0.205 0 0)`); destructive is the only saturated
  hue (`oklch(0.58 0.22 27)`)
- No brand accent color exists. Do not invent one — status is communicated by
  the destructive token and muted surfaces, not by new hues.

## Typography

- UI text: system stack via shadcn defaults. Code, paths, IDs: monospace.
- Headings: default weight scale; dense tables/lists stay at base size —
  never compress long text into tiles or fixed-height cards.

## Layout

- Dashboard-first: lists (leads, jobs) are the landing content, not a
  welcome screen.
- Forms are single-column, single-purpose: field state, validation, one
  mutation, loading/error states. No wizards.
- Responsive: the dashboard must stay usable on a phone in the field.

## Components

shadcn/ui primitives from `@contractor-os/ui` first; local components only
for what the shared package lacks.

| Component | Usage | Notes |
| --- | --- | --- |
| Primary action | Save, create, confirm | High contrast, one per form |
| Secondary action | Cancel, back | Lower weight |
| Feedback | Save, error, loading, empty state | Short and actionable |
| Data lists | Leads, jobs, invoices | Rows over cards; dense but scannable |

## Motion

Motion for feedback and state changes only (loading, success, error).
No decorative motion unrelated to product state.

## Voice

- UI copy is plain and operational: "New lead", "Create job", "Save".
- Error copy says what happened and what to do: not "Something went wrong".
- Empty states say what belongs there and how to add it.
- **No emoji anywhere** — UI, code, markup, or copy.
- **No generic marketing phrasing.** The bar: a buyer gets it and wants to
  call within 3 seconds.

## Brand & assets

- No logo, brand palette, or asset library exists in the repo. The product
  surface is the shadcn default theme until a brand decision is made —
  which is Johnny's call, not an agent's.

## Accessibility

- Keyboard: every form action reachable and operable by keyboard.
- Focus: visible focus states on all interactive elements.
- Contrast: shadcn default tokens meet the bar; do not lower contrast for
  aesthetics.
- Touch: primary actions have adequate touch targets for field use on phones.

## Anti-patterns

- Do not build a generic landing page when the product needs a work surface.
- Do not add decorative gradients, orbs, bokeh, or glass effects.
- Do not invent brand colors, fonts, or voice beyond what the repo evidences.
- Do not compress long text into buttons, cards, table cells, or fixed tiles.
- Do not paper over backend problems in the frontend (e.g. the `cms.ts`
  tenant-isolation hole is a backend fix, not a UI filter).

## Change log

| Date | Change | Notes |
| --- | --- | --- |
| 2026-09-25 | Initial design entry | Derived from repo evidence (shadcn defaults, Johnny's 3-second/no-emoji bar). Jev-selected scope: minimal experience tokens. |
