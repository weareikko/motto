# Hypothesis backlog

Falsifiable, testable claims about skill-authoring format/efficiency, surfaced by a broad research pass across popular real skills and practitioner writeups. None of these are evidenced yet — that's the point of listing them here rather than asserting them as rules. Each is written so it can graduate into its own `docs/research/<name>.md` entry (methodology + result + verdict) once tested, following the pattern set by [`tag-structured-steps.md`](tag-structured-steps.md).

Evidence base for this pass: Anthropic's `skill-creator` and `code.claude.com/docs/en/skills` (thresholds, progressive disclosure), one real multi-schema reference file as a consolidation counter-example, one community router (`agent-dispatch`) and one community eval framework (`wshobson/agents` PluginEval) as methodology models — but **no broad multi-author convergence found for `tool-wrapper` or `meta` structural conventions**. That gap is itself a finding: these two kinds are the least evidenced and most in need of a first empirical pass.

## Reference (domain-knowledge)

1. **Split vs. consolidate.** Does splitting a 600-line reference file into 3 topic files reduce tokens actually *loaded* per typical query, or does file-open overhead (extra round-trips, the agent re-reading shared context) offset the savings? *Counter-evidence already in hand*: `skill-creator`'s own `schemas.md` consolidates 7 schemas into one 430-line file rather than splitting — the flagship example doesn't obviously do what this hypothesis assumes is better. Test: instrument realistic queries against both layouts, measure tokens actually read (tokenizer methodology already validated).
2. **Does the 300-line ToC rule change read behavior?** The threshold is documented, but no source tests whether an agent actually uses a ToC to scope its read to one section vs. reading the whole file regardless. Test: A/B a >300-line file with/without a ToC on targeted lookup queries; measure read scope.
3. **Table vs. prose for lookup facts.** Does presenting reference facts as a markdown table vs. prose change token cost and/or lookup accuracy? Test: direct extension of the tag-steps methodology (blind trial + tokenizer) applied to lookup content instead of sequential steps.

## Multi-domain (variant)

4. **Decision table vs. prose for variant selection.** Does phrasing `SKILL.md`'s selection section as a decision table vs. prose measurably reduce the chance of loading the wrong variant file? Test: blind trials with table-formatted vs. prose-formatted selection logic on deliberately ambiguous scenarios; measure correct-file-load rate.
5. **Net token savings, once selection overhead is counted.** Organize-by-variant (one file per domain) is the documented pattern, but is it actually cheaper in tokens than one consolidated file once the `SKILL.md` selection-logic overhead is counted, for a realistic single-domain query mix? Test: compare total tokens loaded across both layouts.
6. **Ambiguous-query fallback risk.** When a query is genuinely ambiguous between two variants, does the agent load *both* reference files, negating the intended token savings entirely? Test: construct deliberately ambiguous prompts; measure how many variant files actually get opened.

## Tool-wrapper

*(Was the least evidenced kind in this pass — no dedicated structural survey found anywhere.)*

**#7 — RESOLVED**, see [`tool-wrapper-inline-vs-linked-flags.md`](tool-wrapper-inline-vs-linked-flags.md): N=20×3-model-tier blind trial (120 total). No correctness difference between inline and linked (100% avoided the tested flag conflict in both formats, all three tiers). Cost is conditional: linked's always-paid body is 67% cheaper, with a break-even at ~90% reference-consultation rate — above that, linked is slightly more expensive (+7.6%) due to per-file overhead. No new rule (the right choice depends on the tool's flag count and task mix, not something a static linter can infer). A real but tangential secondary finding emerged: model tier (not format) strongly predicts whether a documented constraint conflict gets surfaced to the user explicitly vs. silently resolved — logged as an observation, not a rule, since it's a model trait rather than an authoring choice.

8. **Is there a flag-count threshold** above which moving flags to a reference file becomes net cheaper? **Partially answered by #7's break-even model** (~90% consultation rate is the crossover, independent of flag count per se — the open part is how consultation rate scales with flag-list length specifically). Test: parametric token-cost model validated against real tokenizer counts for a sample wrapper skill at varying flag-list lengths.
9. **In-body examples vs. linked examples, on first-attempt task success.** **Distinct from #7** (which tested flag *reference* detail, not worked *examples*) — still open. Does providing full worked command examples in-body vs. linking to an examples file change first-attempt task success? Test: blind trial comparing task completion across both layouts.

## Meta (router)

*(Second-least evidenced kind — only one real example found, `agent-dispatch`'s flat TOML table; no convergent multi-author pattern.)*

**#11 and #12 — RESOLVED**, see [`meta-dispatch-table-vs-prose.md`](meta-dispatch-table-vs-prose.md): a markdown dispatch table cost ~21% fewer tokens than equivalent prose with no measured routing-accuracy difference (6 blind trials, one router scenario). Shipped as the opt-in `meta-prefers-dispatch-table` rule.

10. **Explicit cross-referencing vs. prose.** Does `[[skill-name]]`-style explicit cross-referencing measurably help routing/discovery accuracy vs. prose mentions of other skills? Test: blind trial with ambiguous task prompts, comparing bracket-style reference lists vs. prose descriptions; measure correct-skill-selection rate. **Still open** — the table-vs-prose test above didn't exercise `[[bracket]]`-style cross-referencing specifically.
11. ~~Structured dispatch table vs. prose, at equal token budget.~~ **Resolved** — see above.
12. ~~Token cost of structured vs. narrative dispatch content.~~ **Resolved** — see above. (The prior sequential-content null result did *not* transfer: table format won here, on cost, unlike tags for steps.)

## Suggested priority

With #7, #11, #12 resolved, remaining highest-value targets: **1** (reference split-vs-consolidate) — we already have a real counter-example in hand (skill-creator's consolidated `schemas.md`) contradicting the intuitive "always split" default. **4–6** (multi-domain) directly bear on the existing `multi-domain-has-variants` rule. **9** (tool-wrapper in-body vs. linked examples) is the remaining open item for the previously-least-evidenced kind. **10** (meta cross-referencing) is a smaller follow-up to the resolved meta pair. **3** (reference table vs. prose) is now lower priority than it looked — the *analogous* meta/dispatch table-vs-prose question (#11/#12) is resolved, but reference-*lookup* content wasn't tested directly and shouldn't be assumed to behave identically.
