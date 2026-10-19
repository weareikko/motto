# Research log

This directory is the evidence base behind `@weareikko/eslint-plugin-skill`'s rules. The project's goal is to make skill authoring choices **measured, not assumed** — every entry here follows the same shape:

1. **Question** — a concrete, falsifiable claim about how to write skills better (for comprehension, cost, or token efficiency).
2. **Evidence** — documented guidance (Anthropic's official docs, the Agent Skills spec) and/or a direct empirical test (blind trials with fresh agent instances, real token counts).
3. **Verdict** — adopt / don't adopt / adopt-with-caveats.
4. **Resulting rule** — the lint rule the verdict justifies, or an explicit note that no rule was warranted.

A **negative result** (evidence says "don't do this") is recorded with the same rigor as a positive one — it's what stops the same idea from being re-litigated later without cause, and stops a plausible-sounding convention from being adopted on vibes.

## Entries

| Question | Verdict | Rule |
| --- | --- | --- |
| [Should procedural steps use `<steps><step>` tags instead of markdown ordered lists?](tag-structured-steps.md) | **Don't adopt** — no comprehension benefit, +23–31% token cost | none (kept `procedural-has-steps` as-is) |
| [Do the documented 500-line body / 300-line ToC thresholds hold up, and how do real skills split reference content?](progressive-disclosure-thresholds.md) | **Confirmed** as advisory; real-world practice (skill-creator) consolidates rather than always splitting | none new (confirms `body-max-length` / `large-reference-toc` as configured) |
| [For a `meta`/router skill, does a dispatch table beat prose — on accuracy, on cost, or both?](meta-dispatch-table-vs-prose.md) | **Adopt, with caveats** — no accuracy difference, but −21.4% token cost (single test) | new opt-in `meta-prefers-dispatch-table` |
| [For a tool-wrapper skill, does inlining the flag reference vs. linking to it change correctness or cost?](tool-wrapper-inline-vs-linked-flags.md) | **No correctness difference** (N=20×3 model tiers, 100% both formats); cost is conditional — linked wins below ~90% reference-consultation rate | none new — depends on tool/task specifics, not linter-inferable |
| [Should a reference skill split into topic files, or consolidate into one?](reference-split-vs-consolidate.md) | **Split, for the realistic case** — 100% correctness both layouts, zero hedging (60/60 opened exactly the right file), ~56% cheaper per single incident; but ~4% *more* expensive if one session genuinely needs all topics | none new — depends on the skill's real query pattern |
| [Multi-domain: does selection format (table/prose) matter, and do agents hedge under ambiguity?](multi-domain-selection.md) | **Format: no difference** (100% both, ~2% token diff). **Hedging: none** (0/40 under ambiguity, ground-truth-verified) — but with an explicit "ask, don't hedge" instruction present | none — see counterfactual below |
| [Is the multi-domain ambiguity-fallback instruction load-bearing?](multi-domain-ambiguity-counterfactual.md) | **No** — removing it changed behavior by zero (0/20 hedged either way, ground-truth-verified; agents recognized ambiguity unprompted) | **rule rejected** — `multi-domain-requires-ambiguity-fallback` would be ceremony |
| [Tool-wrapper: in-body vs. linked worked examples — first-attempt success?](tool-wrapper-examples.md) | **No difference** (120/120 both, 3 tiers; linked agents opened the file 60/60, ground-truth-verified). Cost conditional (linked −38% always-paid) | none — depends on query pattern |
| [Does `[[skill-name]]` cross-referencing beat prose for router accuracy?](meta-cross-reference.md) | **No** — 40/40 correct both formats, incl. a keyword trap | none — brackets give no accuracy gain |
| [Should the linter add prompt/context optimization tooling (caveman/Headroom/LLMLingua/DSPy)?](optimization-tooling-landscape.md) | **No engine** — serious optimization is model-in-the-loop + needs an eval harness; the tools target bloat SKILL.md doesn't have | confirms scope: linter = structural + cost-only format nudges; recommend Headroom/caveman for their (orthogonal) niches |

Every kind's main format question is resolved, and the external optimization-tooling landscape has been surveyed. **Conclusion across all 8 format tests: null on correctness, 100% of the time** (Haiku/Sonnet/Opus). The one shippable rule (`meta-prefers-dispatch-table`) is a *cost* optimization; the one behavior-rule candidate was rejected by its counterfactual. The optimization-tooling review independently corroborates this from the other side: state-of-the-art optimizers (LLMLingua, DSPy) are model-in-the-loop and gate on eval harnesses, and target verbose runtime/RAG bloat — not tight authored instruction files. **A linter's sound remit is structural correctness + statically-checkable, behavior-preserving cost nudges; anything lossy needs the [`evals/`](../../evals/) harness, not a lint rule.** Remaining [`backlog.md`](backlog.md) items (#2/#3/#5/#8) are cost-model refinements unlikely to yield rules.
