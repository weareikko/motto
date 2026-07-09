# skill/meta-prefers-dispatch-table

Suggest a markdown table for a `meta`-kind skill's dispatch/routing list.

> **Opt-in, and evidence-lighter than the plugin's other rules.** Not part of any preset. Backed by a single empirical test — see [`docs/research/meta-dispatch-table-vs-prose.md`](../research/meta-dispatch-table-vs-prose.md) — not the multiply-corroborated evidence behind most other rules here.

This rule only fires when the skill declares itself explicitly:

```yaml
metadata:
  kind: meta
```

A meta (router) skill exists to dispatch requests to other skills. A one-scenario test (5 fictional skills, a fictional router, 6 blind trials) found a markdown table cost **~21% fewer tokens** than equivalent prose for this kind of dispatch content, with no measured routing-accuracy difference. This rule only checks whether the body contains a markdown table at all — it does not try to judge whether a table is semantically "needed," to avoid the false-positive risk of guessing at content meaning.

## Fails

A `metadata.kind: meta` skill whose body has no markdown table anywhere.

## Passes

A `metadata.kind: meta` skill whose body contains at least one markdown table.

## Options

None.

## Why this rule is opt-in

Every other kind-specific rule in this plugin traces to either an official, multiply-corroborated source or a comprehension test with an adversarial, multi-trial design. This one rests on a single router scenario in one domain pairing — real signal, but not yet replicated. Treat it as a cost-saving suggestion worth trying, not an established convention.
