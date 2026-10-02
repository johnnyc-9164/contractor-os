# DESIGN.md — Contractor OS experience design

> Product and experience design: what this product should feel like.
> Project facts belong in `AGENTS.md`; collaboration protocol in `CLAUDE.md`.

## Source of truth

Johnny selected the supplied PaintPro source kit as the visual target on
2026-09-27. The shared system is derived from `manifest/design-tokens.json`
and the complete S36 leads, S37 operations, and S38 customer-website screens.
Those references establish direction, not permission to copy their static
sample data, unsupported AI claims, or screen-specific CSS into the product.

When references conflict, use this order:

1. real product behavior and accessibility;
2. the semantic tokens in `packages/ui/src/styles/globals.css`;
3. repeated evidence across S36, S37, and S38;
4. a single source-screen exception.

## Design intent

- **Audience:** painting-company owners, office operators, estimators, and
  field users moving work from lead to paid job.
- **Primary experience:** a fast operational work surface. The dashboard shows
  what needs attention, the pipeline shows the next sales move, and detail
  views expose the real record and next truthful action.
- **Visual character:** clean, capable, premium utility. Cool neutral surfaces
  keep dense work calm; cobalt identifies navigation, focus, selected state,
  and the primary action.
- **Customer surfaces:** S38 supplies composition and polish for the public
  website, but it does not turn the authenticated product into a marketing
  page. Shared tokens connect the two contexts.

## Color

Use shadcn semantic classes from `@contractor-os/ui`: `bg-background`,
`bg-card`, `bg-primary`, `text-muted-foreground`, `border-border`, and their
peers. Raw palette values belong only in the shared token file, never in a
feature component.

| Role | Light target | Purpose |
| --- | --- | --- |
| Background | cool off-white `#f7f9fb` | app and public-page canvas |
| Card/popover | white `#ffffff` | elevated working surfaces |
| Foreground | ink `#191c1e` | durable body contrast |
| Primary | cobalt `#003ec7` | primary actions and selected navigation |
| Ring | vivid cobalt `#004ced` | keyboard focus and active control edge |
| Accent | pale cobalt `#dde1ff` | selected/hover surface with dark cobalt text |
| Muted | cool gray `#f2f4f6` | secondary surfaces and quiet grouping |
| Destructive | red `#ba1a1a` | failure or irreversible action only |

Dark mode is a first-class operating mode, not a light-theme inversion. It
uses near-black cool surfaces, a light-cobalt primary, and contrast-checked
foreground pairs. Color never carries status alone: every state also has a
plain text label, icon, or structure. Do not use destructive red for lead
intent, urgency, or ordinary business state.

## Typography

- UI text uses `Inter Variable`, then `Inter`, then the native system sans
  stack. The product must remain correct when Inter is unavailable.
- Default body is 16/24. Supporting labels are 12/16 or 14/20; do not shrink
  operational text below 12 px.
- Page headings are 24/32 on compact screens and may reach 32/40 on desktop.
  Marketing display copy may reach 48/56; authenticated tables and forms may
  not.
- Use weight and whitespace before increasing size. Reserve monospace for
  code, paths, immutable IDs, and machine output.

## Spacing, radius, and layout

- Base spacing unit: 4 px. Prefer 8 px compact gaps, 16 px stack gaps, 24 px
  section gutters, and 32 px major separations.
- Page gutter: 16 px on phones, 24 px on medium screens, and 32 px on wide
  screens. Content caps at 1440 px and stays centered when the viewport grows.
- Radius vocabulary: 4 px compact controls, 8 px standard controls/cards,
  12 px prominent containers, and full only for avatars, status pills, and
  intentionally circular icon controls.
- Desktop operations may use a 256–280 px sidebar. On narrow screens, preserve
  content width by moving navigation into the existing responsive pattern.
- Lists and tables are the default for comparable records. Cards summarize or
  group; they do not hide long operational text inside fixed-height tiles.
- Forms remain single-purpose and linear unless the business process truly
  spans independently valid stages. Responsive behavior must preserve labels,
  next actions, and 44 px touch targets.

## Components and composition

Use installed shadcn primitives first. Compose full components rather than
restyling internals: `Card` for grouped summaries, `Table` for comparable
records, `Sheet` for record context, `Badge` for text-backed status, `Skeleton`
for loading, `Empty` for no-results states, and `Alert` for actionable feedback.

- One visually dominant primary action per region.
- Secondary and outline actions must remain visibly subordinate.
- Navigation selection uses the semantic accent or primary family, not a new
  feature color.
- Metrics need a label, value, time/context qualifier, and a truthful source.
- Charts use the shared cobalt scale and must remain understandable without
  color alone.
- AI is a capability, not a visual theme. Label real assistant output and its
  limits; never decorate ordinary automation as intelligence.

## Motion

Motion communicates state change only: loading, completion, reveal, or
navigation context. Keep it brief and respect reduced-motion preferences. No
decorative parallax, ambient motion, or attention-stealing loops.

## Voice

- UI copy is plain and operational: “New lead”, “Create estimate”, “Save”.
- Errors say what happened and what the operator can do next.
- Empty states say what belongs there and provide the real next action.
- No emoji in UI, code, markup, or copy.
- Never claim a record was saved, a message was sent, a price was calculated,
  or a job was booked unless the underlying system proves it.

## Accessibility

- Critical foreground/background pairs meet WCAG AA for normal text (4.5:1).
- Keyboard focus is visible through the semantic ring token.
- Controls have accessible names and adequate field touch targets.
- Selected, error, and status states use more than color.
- Light and dark modes preserve hierarchy, contrast, and disabled-state
  legibility; feature code does not patch dark mode with raw colors.

## Anti-patterns

- No gradients, glass panels, blur glows, decorative orbs, bokeh, or “AI”
  chrome.
- No per-feature palette, raw cobalt literals, or manual `dark:` color fixes.
- No generic dashboard filler, fake metrics, fake AI summaries, or inactive
  controls presented as working product.
- No marketing hero inside the authenticated operations shell.
- No long text compressed into buttons, badges, table cells, or fixed tiles.
- No frontend filtering that pretends to solve backend authorization or data
  integrity.

## Change log

| Date | Change | Notes |
| --- | --- | --- |
| 2026-09-27 | PaintPro foundation | Replaced the temporary neutral-only rule after Johnny selected the supplied PaintPro kit; established cobalt semantics, accessible modes, typography, spacing, radius, and composition rules. |
| 2026-09-25 | Initial design entry | Temporary repo-evidence baseline using shadcn defaults. |
