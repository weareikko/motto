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

*(Least evidenced kind in this pass — no dedicated structural survey found anywhere. A first empirical pass here has outsized value.)*

7. **Inline vs. linked flag reference, given asymmetric loading.** A tool-wrapper's body loads on *every* invocation; a linked `references/` file loads only on demand. Does inlining a tool's flag reference in the body vs. linking to a file change net token cost — and at what usage pattern does each win? Test: compute a break-even model (invocation count × flag-list size) and validate against real tokenizer counts.
8. **Is there a flag-count threshold** above which moving flags to a reference file becomes net cheaper? Test: parametric token-cost model validated against real tokenizer counts for a sample wrapper skill at varying flag-list lengths.
9. **In-body examples vs. linked examples.** Does providing full worked command examples in-body (repeated cost every load) vs. linking to an examples file (cost only when needed) change first-attempt task success — trading recurring token cost for fewer clarification round-trips? Test: blind trial comparing task completion across both layouts.

## Meta (router)

*(Second-least evidenced kind — only one real example found, `agent-dispatch`'s flat TOML table; no convergent multi-author pattern.)*

**#11 and #12 — RESOLVED**, see [`meta-dispatch-table-vs-prose.md`](meta-dispatch-table-vs-prose.md): a markdown dispatch table cost ~21% fewer tokens than equivalent prose with no measured routing-accuracy difference (6 blind trials, one router scenario). Shipped as the opt-in `meta-prefers-dispatch-table` rule.

10. **Explicit cross-referencing vs. prose.** Does `[[skill-name]]`-style explicit cross-referencing measurably help routing/discovery accuracy vs. prose mentions of other skills? Test: blind trial with ambiguous task prompts, comparing bracket-style reference lists vs. prose descriptions; measure correct-skill-selection rate. **Still open** — the table-vs-prose test above didn't exercise `[[bracket]]`-style cross-referencing specifically.
11. ~~Structured dispatch table vs. prose, at equal token budget.~~ **Resolved** — see above.
12. ~~Token cost of structured vs. narrative dispatch content.~~ **Resolved** — see above. (The prior sequential-content null result did *not* transfer: table format won here, on cost, unlike tags for steps.)

## Suggested priority

With #11–12 resolved, remaining highest-value targets: **7–9 (tool-wrapper)** — still the least evidenced kind, zero dedicated rules, and now the *only* remaining kind with no empirical pass at all. **1** (reference split-vs-consolidate) is next most interesting because we already have a real counter-example in hand contradicting the intuitive default. **4–6** (multi-domain) directly bear on the existing `multi-domain-has-variants` rule. **10** (meta cross-referencing) is a smaller follow-up to the now-resolved meta pair.
