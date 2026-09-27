---
name: extracting-design-system
description: Use when screenshots, HTML, CSS, Stitch exports, mockups, or an existing interface must become a reusable design system before React implementation.
---

# Extracting Design System

## Objective
Convert the complete visual source set into design truth that another agent can implement without re-interpreting every source screen.

Treat:
- screenshots as visual truth,
- HTML as structural evidence,
- CSS as implementation evidence,
- repeated patterns as stronger evidence than one-offs.

Do not build React screens in this skill.

## Required outputs
Write these under `design/`:

- `DESIGN.md` — visual judgment, composition rules, interaction rules, anti-patterns.
- `theme.css` — deterministic CSS variables and Tailwind-compatible semantic tokens.
- `design-system.json` — canonical machine-readable token/system manifest.
- `primitives.json` — atomic UI requirements and variants.
- `patterns.json` — repeated compositions.
- `layouts.json` — repeated page structures.
- `screens.json` — every source screen as a composition recipe.
- `registry-gaps.json` — unresolved UI requirements for the retrieval skill.
- `evidence.json` — OBSERVED / INFERRED / PROPOSED / UNKNOWN provenance.
- `extraction-eval.md` — extraction evaluation and result.

## Workflow
1. Inventory every source screen before extracting the system.
2. Parse HTML/CSS when available. Measure repeated colors, typography, spacing, radii, borders, shadows, widths, control heights, breakpoints and icon sizes.
3. Cluster near-identical raw values into semantic tokens. Preserve exceptions only when repeated evidence or visible intent justifies them.
4. Write `theme.css`. Prefer semantic variables such as `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--radius`.
5. Write `DESIGN.md` as judgment rather than a CSS dump. Cover visual identity, hierarchy, density, layouts, composition, responsive behavior, states, accessibility expectations and explicit anti-patterns.
6. Extract primitives, then repeated patterns, then layouts. Prefer the smallest vocabulary that reconstructs the whole product.
7. Create a recipe for every screen: layout + ordered component requirements + visible states.
8. Classify each component requirement as `LOCAL`, `STANDARD`, `SEARCH`, `ADAPT`, or `CUSTOM`. Do not invent registry matches.
9. Record evidence provenance. If HTML and screenshot conflict, record the conflict; appearance normally follows the screenshot, hidden semantics normally follow HTML.

## Tailwind rule
Tailwind is an implementation vocabulary, not design truth. Downstream code should consume semantic tokens and approved component variants rather than arbitrary values.

Bad: `rounded-[13px] bg-[#f7f7f8] px-[17px]`
Preferred: `rounded-md bg-card px-4`

## Extraction eval harness
Evaluate the design package before handoff.

Select at least:
- one dense list/dashboard,
- one detail screen,
- one form/workflow screen.

For each target, verify that its recipe can account for every major visible region without adding screen-specific styling rules.

Score each category 0–2:
- token coverage,
- typography,
- spacing/layout,
- colors/surfaces,
- primitive coverage,
- pattern consolidation,
- responsive/state coverage,
- provenance clarity.

`extraction-eval.md` must list evidence, failures, fixes and `final result: passed|blocked`.

Pass only when:
- every supplied screen is inventoried and has a recipe,
- no unexplained major visual region remains,
- repeated patterns are consolidated,
- `DESIGN.md`, JSON manifests and `theme.css` agree,
- unknowns/conflicts are explicit.

When evaluation fails, repair the underlying token/pattern/layout/rule, not an individual screen recipe.

## Definition of done
A downstream agent can understand the brand, search for the missing building blocks, and reconstruct the supplied screens without reopening each original source merely to rediscover the design system.
