---
name: retrieving-composing-ui
description: Use when a design package or screen specification must be implemented in React by searching reusable component registries before creating custom UI.
---

# Retrieving and Composing UI

## Objective
Turn `design/` artifacts into reusable React UI with maximum source reuse and minimum bespoke code.

**REQUIRED INPUT:** output of `extracting-design-system`, especially `DESIGN.md`, `theme.css`, `screens.json`, `primitives.json`, `patterns.json`, and `registry-gaps.json`.

## Reuse order
For every requirement, search in this order:
1. existing project components and project registry,
2. approved standard primitives,
3. configured shadcn registries,
4. agent-searchable external sources such as 21st.dev, ReUI, Cult UI, Aceternity, and other approved registries,
5. adapt the closest compatible source,
6. custom-build only when no acceptable candidate exists.

Never choose by name alone. Inspect source, dependencies, accessibility, responsive behavior, license/usage constraints when relevant, and visual fit.

## Required outputs
Maintain:
- `ui/component-map.json` — requirement → chosen implementation.
- `ui/provenance.json` — origin, registry/package, original item, modifications.
- `ui/registry.json` — reusable normalized project components eligible for publishing.
- `ui/composition-report.md` — search decisions, unresolved gaps and verification.
- React components/screens in the repository's normal locations.

## Candidate contract
For each unresolved requirement record:
- search terms,
- candidates inspected,
- selected candidate or `CUSTOM`,
- why it fits,
- dependencies,
- normalization required,
- source/provenance.

Do not silently substitute a vaguely similar component.

## Normalize once
Imported components must be adapted to the extracted system:
- consume `theme.css` semantic tokens,
- follow `DESIGN.md`,
- use project Tailwind conventions,
- expose typed props,
- remove demo-only data/styles,
- preserve accessibility behavior,
- avoid unnecessary vendor wrappers.

If the normalized component is reusable, promote it to the project's registry/component package. Screens consume the normalized component, not repeated copied source.

## Composition rule
Screens should primarily be composition:

`tokens → primitives → patterns → layouts → screen`

Do not recreate the Stitch HTML tree. Do not generate a unique component hierarchy for every screen when recipes share patterns.

## Backend seam
UI remains backend-independent. Domain components expose typed contracts:

```tsx
<JobsTable jobs={jobs} onSelect={onSelect} />
```

Do not place Convex queries/mutations inside generic primitives. Application/container code binds data and actions later.

## Verification loop
For each screen:
1. implement from the screen recipe,
2. render at the source viewport/state,
3. capture the implementation,
4. compare it with the source visual,
5. classify differences P0–P3,
6. fix P0/P1/P2,
7. recapture and compare again.

Check explicitly:
- typography,
- spacing/layout rhythm,
- colors/tokens,
- assets/icons,
- content,
- responsive behavior,
- interaction states,
- accessibility,
- console/runtime errors.

Do not declare completion from code inspection.

## Search failure rule
If registry search produces no acceptable result, document what was searched and why candidates failed before creating custom UI. Custom UI should then be promoted as reusable when appropriate.

## Definition of done
Every screen recipe is implemented; provenance is recorded; reusable components live in the project registry/component layer; no actionable P0/P1/P2 visual differences remain; typecheck/lint/tests applicable to the repo pass.
