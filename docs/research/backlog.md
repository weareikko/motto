# Hypothesis backlog

Falsifiable, testable claims about skill-authoring format/efficiency, surfaced by a broad research pass across popular real skills and practitioner writeups. None of these are evidenced yet — that's the point of listing them here rather than asserting them as rules. Each is written so it can graduate into its own `docs/research/<name>.md` entry (methodology + result + verdict) once tested, following the pattern set by [`tag-structured-steps.md`](tag-structured-steps.md).

Evidence base for this pass: Anthropic's `skill-creator` and `code.claude.com/docs/en/skills` (thresholds, progressive disclosure), one real multi-schema reference file as a consolidation counter-example, one community router (`agent-dispatch`) and one community eval framework (`wshobson/agents` PluginEval) as methodology models — but **no broad multi-author convergence found for `tool-wrapper` or `meta` structural conventions**. That gap is itself a finding: these two kinds are the least evidenced and most in need of a first empirical pass.

## Reference (domain-knowledge)

**#1 — RESOLVED**, see [`reference-split-vs-consolidate.md`](reference-split-vs-consolidate.md): N=20×2-layout blind trial (40 total, 60 graded incidents). 100% correctness both layouts; the agent opened *exactly* the one relevant topic file in 60/60 split-condition incidents (zero hedging). Per single incident (the realistic unit), split is ~56% cheaper. But a session needing all three topics at once flips this: split's cumulative file-open cost comes out ~4% *more* expensive than one consolidated read — a real, disclosed boundary condition, not a clean "always split" result. No new rule (depends on the skill's real query pattern, not something structurally inferable).

2. **Does the 300-line ToC rule change read behavior?** The threshold is documented, but no source tests whether an agent actually uses a ToC to scope its read to one section vs. reading the whole file regardless. Test: A/B a >300-line file with/without a ToC on targeted lookup queries; measure read scope.
3. **Table vs. prose for lookup facts.** Does presenting reference facts as a markdown table vs. prose change token cost and/or lookup accuracy? Test: direct extension of the tag-steps methodology (blind trial + tokenizer) applied to lookup content instead of sequential steps.

## Multi-domain (variant)

**#4 and #6 — RESOLVED**, see [`multi-domain-selection.md`](multi-domain-selection.md): 80-trial blind test ({table,prose} selection logic × {clear,ambiguous} queries × N=20), ground-truth-audited against actual `Read` tool calls. #4: table vs. prose made no difference to selection accuracy (both 100% correct on clear queries) and negligible token difference (~2%, unlike meta-dispatch's 21% — a short keyword mapping has little scaffolding to cut). #6: with an explicit "if ambiguous, ask; don't read all variants" instruction in `SKILL.md`, the agent hedged 0/40 times (ground-truth-verified zero variant reads under ambiguity) — the hedging risk did not materialize. **Caveat**: this measured *compliance* with that instruction, not spontaneous behavior; the counterfactual (#6b below) is the real test of whether the instruction is load-bearing.

5. **Net token savings, once selection overhead is counted.** Organize-by-variant (one file per domain) is the documented pattern, but is it actually cheaper in tokens than one consolidated file once the `SKILL.md` selection-logic overhead is counted, for a realistic single-domain query mix? Test: compare total tokens loaded across both layouts. **Partially informed by [#1](reference-split-vs-consolidate.md)** (split wins per single-domain query, loses if one session spans all domains) — the multi-domain-specific angle is the added selection-logic overhead in the body, which [#4/#6](multi-domain-selection.md) measured at ~265–270 tokens.
6. ~~Ambiguous-query fallback risk.~~ **Resolved** — see above.
6b. **Counterfactual for #6 (is the ambiguity-fallback instruction load-bearing?).** Re-run the ambiguous condition with a third `SKILL.md` variant that has NO "ask, don't hedge" instruction. If agents still refrain from opening all variant files, the instruction is ceremony (no rule). If they hedge without it, the instruction is load-bearing and `multi-domain-requires-ambiguity-fallback` becomes an evidence-backed rule. Test: same harness as #4/#6, adding a no-instruction arm; measure ground-truth variant files opened under ambiguity.

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

With #1, #4, #6, #7, #11, #12 resolved, remaining highest-value target is **#6b** (the counterfactual: is the ambiguity-fallback instruction load-bearing?) — it's the only open question that could still yield a shippable, evidence-backed rule (`multi-domain-requires-ambiguity-fallback`), and the harness already exists from #4/#6. After that: **9** (tool-wrapper in-body vs. linked examples), **10** (meta cross-referencing), then the lower-priority **2, 3, 5** (reference ToC behavior, table vs. prose, multi-domain net token accounting).

Meta-observation across resolved items: format/structure choices keep coming back **null on correctness** (tags, tool-wrapper, reference-split, and now multi-domain selection) — the only shippable rule so far (`meta-prefers-dispatch-table`) is a *cost* optimization, not a correctness one. #6b is notable as the first candidate for a **correctness/behavior** rule, which is why it's the top priority: it's where a rule would add the most value if the evidence supports it.
