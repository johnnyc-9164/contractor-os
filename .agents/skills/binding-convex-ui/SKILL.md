---
name: binding-convex-ui
description: Use when reusable React UI already exists and must be connected to Convex queries, mutations, actions, realtime state, and domain data without coupling backend logic into design primitives.
---

# Binding Convex UI

## Objective
Bind verified UI contracts to Convex while preserving the design/component boundary.

**REQUIRED INPUT:** composed React screens/components with typed props. Do not use this skill to invent the visual system.

## Boundary
Keep:
- generic primitives: presentation only,
- reusable domain UI: typed data/action props,
- containers/routes/features: Convex hooks and orchestration,
- Convex functions: authorization, validation and domain/data behavior.

Prefer:

```tsx
function JobsRoute() {
  const jobs = useQuery(api.jobs.list)
  const updateJob = useMutation(api.jobs.update)
  return <JobsScreen jobs={jobs} onUpdate={updateJob} />
}
```

over embedding Convex calls deep inside `Card`, `Table`, `StatusBadge`, or other reusable primitives.

## Contract-first binding
For each screen:
1. read its UI prop/event contract,
2. map each field to a canonical domain type,
3. identify required query/mutation/action,
4. reuse existing Convex functions before adding new ones,
5. add the narrowest missing backend capability,
6. model loading, empty, error, optimistic and permission states explicitly,
7. keep server-side authorization and validation in Convex.

Generate or maintain `bindings/ui-convex-map.json`:
- screen/component,
- prop/event,
- Convex function,
- domain type,
- state handling,
- unresolved gap.

## Verification
For each bound flow verify:
- initial query,
- loading/empty/error states,
- successful mutation,
- mutation failure,
- realtime update behavior when applicable,
- authorization boundary,
- optimistic UI rollback when applicable,
- typecheck and relevant tests.

Then rerun the visual eval for states affected by live data. Backend binding is not allowed to degrade the approved design.

## Definition of done
The UI remains reusable and visually stable, Convex is connected at clear container/domain seams, all required states are handled, and the end-to-end user flow is verified.
