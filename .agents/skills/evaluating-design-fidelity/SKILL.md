---
name: evaluating-design-fidelity
description: Use when a rendered React implementation has a screenshot, mockup, Stitch export, or other visual source of truth and must be checked for design fidelity before acceptance.
---

# Evaluating Design Fidelity

## Objective
Operate the visual eval harness. Acceptance requires rendered evidence, not confidence from source code.

## Inputs
Require:
- source visual target,
- rendered implementation,
- matching route/state/theme,
- target viewport.

If source or render cannot be captured, result is `blocked`.

## Normalize first
Match viewport, crop, scale and device density. Do not score browser chrome, canvas padding, or density mismatch as design defects.

## Compare
Use a full-view comparison for composition and focused region comparisons for details that are too small to judge globally.

Explicitly evaluate:
1. typography/font family, weight, size, line height and wrapping,
2. spacing, alignment, dimensions, density, radius and elevation,
3. colors, semantic states and token usage,
4. images, icons and asset fidelity,
5. copy/content,
6. responsive behavior,
7. loading/empty/error/selected/disabled/hover/focus states when represented,
8. accessibility and broken interactions.

## Severity
- P0 — core use blocked, severe accessibility or broken layout.
- P1 — major visible mismatch/usability regression.
- P2 — moderate visual/state/responsive drift.
- P3 — minor polish.

## Iteration contract
A comparison with any P0/P1/P2 is not a pass.

For each iteration:
1. capture source + implementation at the same state,
2. record findings with location, evidence, impact and concrete fix,
3. fix the underlying token/primitive/pattern/layout when the defect repeats,
4. recapture,
5. compare again,
6. preserve the history.

Do not patch many screens independently when one design-system correction resolves the defect.

## Required output
Write `design-qa.md` containing:
- source path/reference,
- implementation screenshot path/reference,
- viewport and state,
- full-view evidence,
- focused-region evidence or reason not needed,
- findings,
- fixes,
- comparison history,
- final result.

`final result` must be exactly `passed` or `blocked`.

Pass only with no actionable P0/P1/P2 findings. P3 may remain as follow-up polish.
