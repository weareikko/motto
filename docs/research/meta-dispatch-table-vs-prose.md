# For a `meta`/router skill, does a dispatch table beat prose — on accuracy, on cost, or both?

**Verdict: adopt, with caveats.** No measured routing-accuracy difference, but the table format cost **21.4% fewer tokens** for equivalent content — the inverse of the tag-steps result, where added structure cost more for the same null accuracy effect.

## Question

Combines backlog hypotheses [#11 and #12](backlog.md#meta-router): does phrasing a router skill's dispatch list as a markdown table vs. prose change routing accuracy, and does it change token cost, at roughly matched content?

`meta`/router skills were flagged in the prior research pass as the least-evidenced kind — zero dedicated rules exist, and no multi-author convergent structural pattern was found anywhere. This is the first empirical pass at that gap.

## Method

A fictional 5-skill router (`support-router`) was written in two formats carrying the same factual content — one as prose paragraphs per skill, one as a markdown table:

- `ledger-close` / `ledger-audit` — an adjacent, confusable pair (financial closing vs. audit review).
- `fleet-routing` / `fleet-maintenance` — a second adjacent, confusable pair (route planning vs. vehicle service).
- `onboarding-docs` — an unrelated control.

Fictional names were used so the test measures reading comprehension of the router body, not the model's prior knowledge of real skill names.

7 classification queries were pre-registered with expected answers before running any trial: 4 unambiguous (one per non-control skill... adjusted below), 2 deliberately ambiguous between an adjacent pair (testing whether format changes which way the model resolves the ambiguity), 1 control.

Each format was given to **3 fresh, isolated agent instances** (6 trials total) with the router body and all 7 queries, asked to classify each and output nothing else.

## Results

| Trial | Format | Score vs. pre-registered answers |
| --- | --- | --- |
| 1 | prose | 7/7 |
| 2 | prose | 6/7 |
| 3 | prose | 6/7 |
| 1 | table | 6/7 |
| 2 | table | 6/7 |
| 3 | table | 6/7 |

The single miss in 5 of 6 trials was the same query (Q3, the ledger pair's ambiguous case): 5/6 trials — regardless of format — classified it as `ledger-audit`; only prose-trial-1 chose `ledger-close`. The other ambiguous query (Q6, the fleet pair) was **6/6 identical** across both formats (`fleet-routing`).

**Methodological caveat, stated plainly**: Q3's pre-registered "correct" answer (`ledger-close`, reasoned from "before we finalize the books") was a judgment call, not an objectively verifiable fact — the model's consistent 5/6 lean toward `ledger-audit` ("anything that looks off" reads as audit language) is a defensible alternative reading. This means Q3 doesn't cleanly measure *accuracy*; what it does cleanly show is **consistency**: the model's classification of the same ambiguous query did not change based on format. Combined with Q6's clean 6/6 agreement, the accuracy/consistency finding stands regardless of how Q3's ground truth is scored: **format made no measurable difference to routing behavior.**

### Token cost

Measured with `@anthropic-ai/tokenizer` on the two router bodies (same 5 skills, same factual content):

| Format | Tokens | vs. prose |
| --- | --- | --- |
| Prose | 234 | — |
| Table | 184 | **−50 tokens (−21.4%)** |

This is the **opposite direction** from the `<steps><step>` investigation, where adding structure (tags) cost *more* tokens than the plain-prose/list equivalent. The mechanism is different: XML tags are pure overhead (opening/closing markup with no informational content), whereas a table replaces repeated sentence scaffolding ("The X skill handles...", "Use it when...") with column structure — the saving comes from cutting prose connective tissue, not from the format itself being "denser."

## Verdict

**Adopt, with caveats.** For `meta`/router dispatch content specifically: a markdown table costs measurably less than equivalent prose, with no observed routing-accuracy cost, in this test. Caveats to weigh before treating this as settled:

- **Single test scenario**, one router, one domain pairing, 6 trials. This is a first pass, not a replicated finding — treat as moderate confidence, not the same bar as the multiply-corroborated size thresholds.
- The null accuracy result **should not be assumed to generalize** to routers with many more entries (10+), where a table's scanability advantage might start to matter more, or to entries requiring longer free-text disambiguation that doesn't fit a table cell well.
- This result is specific to **lookup/dispatch-shaped content** (key → short description). It does not contradict, and is not contradicted by, the tag-steps finding for **sequential** content — different content shapes, different mechanisms, tested separately on purpose (per the backlog's own note that the null result for tags should not be assumed to transfer).

## Resulting rule

New, **opt-in** (not in `recommended`/`strict`, matching the confidence level): a `meta`-kind skill with several dispatch entries in prose gets a suggestion to consider a table. Kept structural and conservative — the rule only checks for the *presence* of a markdown table in the body, not semantic content, avoiding the kind of guessy heuristic the taxonomy design deliberately steered away from.

## Reproduce

Fixture content (both router formats, the 7 queries with pre-registered expected answers and notes) is checked in at [`fixtures/meta-dispatch-table-vs-prose/`](fixtures/meta-dispatch-table-vs-prose/). The exact reproduction script is [`scripts/meta-dispatch-table-vs-prose.workflow.js`](scripts/meta-dispatch-table-vs-prose.workflow.js) (fixture content is duplicated inline in the script since Workflow scripts have no filesystem access):

```
Workflow({ scriptPath: 'docs/research/scripts/meta-dispatch-table-vs-prose.workflow.js' })
```

The script logs a `summary` object with per-format, per-query correctness counts against the pre-registered answers in `queries.json`. Raise the `N` constant for more statistical power than the original N=3.
