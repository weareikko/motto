# Is a multi-domain skill's "ask, don't hedge" ambiguity instruction load-bearing?

**Verdict: no — the instruction is not load-bearing, so no rule ships.** Resolves backlog [#6b](backlog.md), the counterfactual to [#6](multi-domain-selection.md). Removing the explicit ambiguity-fallback instruction changed agent behavior under ambiguity by **zero** (0/20 hedged with it, 0/20 hedged without it, ground-truth-verified). The candidate `multi-domain-requires-ambiguity-fallback` rule would enforce ceremony, so it is not shipped.

## Question

The [#6 test](multi-domain-selection.md) found agents never hedged (never opened all variant files) under ambiguous queries — but its `SKILL.md` *explicitly told* them to ask rather than hedge, so it measured instruction compliance, not spontaneous behavior. #6b asks the load-bearing question directly: **if you remove that instruction, do agents start hedging (open ≥2 variant files) or silently pick a wrong variant?** If yes, the instruction earns a rule; if no, it's ceremony.

## Method

A direct A/B, both arms run fresh in one workflow for identical conditions:

- **withInstruction**: the `#6` prose `SKILL.md` (contains "If the request does not clearly identify exactly one provider … do not guess and do not read every reference file. Ask the user which provider they mean.").
- **noInstruction**: the same file with **only that paragraph removed** — normal-case selection logic kept byte-for-byte identical (verified by diff). This isolates exactly the instruction the candidate rule would require.

2 conditions × 2 query levels (clear control / ambiguous) × N=20 = **80 trials**, one query per agent, real `Read`-tool access.

## Results

| Cell | Outcome | Avg variant files opened |
| --- | --- | --- |
| withInstruction · clear | 20/20 correct provider, 1 file | 1.0 |
| noInstruction · clear | 20/20 correct provider, 1 file | 1.0 |
| withInstruction · ambiguous | 20/20 asked for clarification | 0.0 |
| **noInstruction · ambiguous** | **20/20 asked for clarification** | **0.0** |

**Ground-truth audit** (actual `Read` calls in all 80 per-agent transcripts, not self-reports): in the decisive `noInstruction:ambiguous` cell, **0/20 opened any variant file** (18 matched the query-string classifier + 2 that paraphrased the query in-transcript; all 20 opened zero variant files regardless). `noInstruction:clear` opened its one correct file 20/20. Identical to the with-instruction arm.

**The agents' actual reasoning** (no-instruction, ambiguous — sampled from transcripts) shows genuine, unprompted ambiguity recognition, not lucky deferral:

> "'Managed Kubernetes cluster' maps equally to all three providers (AWS EKS, GCP GKE, Azure AKS), and the request names no provider… none of those appear here."

> "The request names no provider. 'Whichever cloud we already run our container workloads on' points to existing infrastructure, but all three providers offer managed container workloads, so the phrasing alone doesn't pick one."

The agent independently derived the "this is ambiguous across all three → don't pick" conclusion from the *normal-case* selection logic alone (which keys on provider-specific names), without any instruction telling it what to do when nothing matches.

## Verdict

**The ambiguity-fallback instruction is not load-bearing** for this model tier and this ambiguity type. Its removal produced no hedging, no silent wrong-picks, no measurable behavior change at all. Therefore:

- **No rule ships.** `multi-domain-requires-ambiguity-fallback` (the candidate flagged in [#6](multi-domain-selection.md)) is **rejected** — it would flag skills for omitting an instruction that demonstrably doesn't change behavior, i.e. enforce ceremony. This is exactly the outcome the project's "measure before enforcing" bar exists to catch: a plausible, well-motivated rule idea, killed by its own counterfactual before it could add false-positive noise to every multi-domain skill.
- The [#6](multi-domain-selection.md) authoring *guidance* softens accordingly: an explicit ambiguity-fallback instruction is harmless and arguably good documentation, but it is **not required** for correct behavior — so the linter should neither require it nor warn on its absence.

## What this does and doesn't settle

- It settles that **the instruction isn't necessary** to prevent hedging here. It does **not** claim instructions never matter — only that *this* one, for *this* well-structured selection skill, is redundant with what the agent already infers.
- The clean behavior likely depends on the normal-case selection logic being clear and keyword-based (the agent could see that *no* keyword matched). A vaguer or overlapping selection section might not produce the same spontaneous deferral — untested.
- Single model tier (session default). A Haiku/Sonnet/Opus split could reveal tier-dependence: a weaker model might hedge without the instruction where a stronger one doesn't. That's the natural extension if this question resurfaces — but on current evidence, the rule is not justified.

## Reproduce

Fixtures at [`fixtures/multi-domain-selection/`](fixtures/multi-domain-selection/) — the `no-instruction/` variant is the `prose/` one minus the ambiguity paragraph (confirm with `diff prose/SKILL.md no-instruction/SKILL.md`). Script: [`scripts/multi-domain-ambiguity-counterfactual.workflow.js`](scripts/multi-domain-ambiguity-counterfactual.workflow.js) — edit the two path constants, then `Workflow({ scriptPath: … })`. Ground-truth audit: parse the run's per-agent transcripts for `Read` calls on `references/*.md`, bucketed by the distinctive query strings and by presence of the ambiguity-paragraph text.
