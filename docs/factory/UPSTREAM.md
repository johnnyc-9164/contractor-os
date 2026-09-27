# Upstream provenance

The fail-closed gate pattern, negative-test proof, merge guard, charter model, and
immutable-run convention were adapted from Addy Osmani's `addyosmani/factory`,
commit `8af116567166a0a16588b7ab1b9934ece0b775bc`, licensed MIT.

The Symphony workflow shape follows `openai/symphony`'s published `WORKFLOW.md`
contract and specification. Contractor OS changes the control plane deliberately:
Symphony/GitHub Issues remain the only dispatch queue, and agents stop at the
`factory:awaiting-review` label.
