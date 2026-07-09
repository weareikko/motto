# Should a reference skill split its content into topic files, or consolidate into one?

**Verdict: split, for the realistic case — with a real, disclosed boundary condition.** Resolves backlog hypothesis [#1](backlog.md#reference). The agent reliably opened *only* the relevant topic file (60/60 incidents, zero hedging), giving split a measured ~56% token saving per single incident — but a session that genuinely needs multiple topics' content flips the result slightly the other way.

## Question

`skill-creator`'s own `references/schemas.md` consolidates 7 schemas into one 430-line file rather than splitting per-schema — a real counter-example to the intuitive "always split for token efficiency" default (see [progressive-disclosure-thresholds.md](progressive-disclosure-thresholds.md)). Does splitting a reference file into topic-specific files actually reduce tokens *loaded per real query*, or does file-open overhead — or the agent hedging by opening everything anyway — offset the savings?

## Method

A fictional `reference`-kind skill (`incident-runbooks`) covering three on-call incident topics (database, network, auth outages), each with a specific remediation command and a specific "do NOT do X" gotcha (so an incomplete or wrong-topic answer is objectively detectable). Two layouts, identical content:

- **Consolidated**: one `references/runbooks.md` with all three topics as sections; `SKILL.md` links to it.
- **Split**: three separate files (`database-outage.md`, `network-outage.md`, `auth-outage.md`); `SKILL.md` links to all three with a one-line description of what each covers.

**N=20 trials per layout** (40 total), each given the `SKILL.md` path with real `Read`-tool access and asked to triage **three** incident scenarios (one per topic) in a single session, reporting the remediation command, the thing to avoid, and which reference filename(s) it actually opened for each.

## Results

**Correctness: 100% in both layouts**, all three topics (60/60 correct commands, 60/60 correct avoidances, 0/60 cross-contamination — no answer pulled in a different topic's remediation). Manually spot-checked several raw responses beyond the automated regex grader to confirm these are genuinely correct, substantive answers, not lucky keyword matches.

**File-opening discipline: exactly what the hypothesis needed to know.** Audited all 60 split-condition incidents individually: **60/60 opened exactly the one relevant topic file** — never zero, never more than one. No hedging, no "open everything to be safe."

### Token cost — two framings, because the test structurally measured both

Measured with `@anthropic-ai/tokenizer`:

| | `SKILL.md` | Reference content |
| --- | --- | --- |
| Consolidated | 99 tokens | `runbooks.md`: 1084 tokens |
| Split | 158 tokens | `database-outage.md`: 382 / `network-outage.md`: 348 / `auth-outage.md`: 345 tokens |

**Per single incident** (the realistic unit — an on-call engineer handles one incident per session, not three unrelated ones at once):

| Topic | Split total | vs. consolidated (1183 tokens, always) |
| --- | --- | --- |
| Database | 540 | **−54.4%** |
| Network | 506 | **−57.2%** |
| Auth | 503 | **−57.5%** |
| Average | 516 | **−56.4%** |

**Per session needing all three topics** (what this test's design mechanically produced, by asking all three incidents in one trial): split's cumulative cost is `158 + 382 + 348 + 345 = 1233` tokens — **4.2% *more* expensive** than consolidated's `1183`, because consolidated reads its one file once and reuses it for all three answers, while split must open all three files to cover all three topics.

## Verdict

**Split wins for the case that matters in practice** — one incident, one session, which is how on-call actually works (you don't get paged for three unrelated systems at once and triage them in one sitting). The ~56% saving is real and is *not* eroded by hedging: the agent's file-opening was perfectly disciplined across all 60 tested incidents, because the `SKILL.md`'s one-line per-file descriptions gave it enough signal to choose confidently every time.

**The boundary condition is real and worth stating plainly**: if a single session's task genuinely spans multiple topics, split's per-file overhead compounds and can net out slightly worse than one consolidated read. This reframes `skill-creator`'s own consolidation choice for `schemas.md` as plausibly *correct for its own case* — schema lookups during skill authoring may routinely need to cross-reference multiple schemas in one sitting, which is exactly the regime where consolidation wins.

## Resulting rule

None new. This is a genuine authoring tradeoff that depends on the skill's real query pattern (mostly single-topic vs. mostly multi-topic-per-session), not something a static linter can infer from file structure alone. The existing rules (`large-reference-toc` for the consolidated path if it grows past 300 lines; `descriptive-reference-filenames` for the split path) already cover the parts that *are* structurally checkable.

## Caveats

- Single scenario (one fictional runbook domain, three topics). The clean per-file discipline result is encouraging but rests on `SKILL.md` giving a clear, distinguishing one-line description per file — an under-described split (e.g. vague or overlapping file descriptions) could plausibly produce the hedging behavior this test didn't observe.
- All three topics were mutually exclusive by design (no incident legitimately needed two topics' content). A reference skill where topics genuinely overlap would change the calculus.
- Single model tier (session default). Not re-tested across Haiku/Sonnet/Opus the way the tool-wrapper investigation was — the file-opening-discipline finding is plausibly capability-dependent and would be a natural cross-model follow-up.

## Reproduce

Fixture files (both layouts, real `SKILL.md` + `references/`) are checked in at [`fixtures/reference-split-vs-consolidate/`](fixtures/reference-split-vs-consolidate/). Reproduction script: [`scripts/reference-split-vs-consolidate.workflow.js`](scripts/reference-split-vs-consolidate.workflow.js):

```
# Edit CONSOLIDATED_PATH and SPLIT_PATH at the top of the script to your
# checkout's absolute paths, then:
Workflow({ scriptPath: 'docs/research/scripts/reference-split-vs-consolidate.workflow.js' })
```

The script logs a `summary` with per-topic `correctCommand`/`correctAvoid`/`crossContaminated` counts and a `filesOpenedSample`; the full `raw` array has every trial's exact files-opened string for a manual audit like the one performed here.
