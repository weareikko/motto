# Does `[[skill-name]]` cross-referencing improve router accuracy over prose?

**Verdict: no — no accuracy difference.** Resolves backlog [#10](backlog.md). A `meta`/router body that names target skills with explicit `[[bracket]]` cross-references routed **exactly as accurately** as one that names them in plain prose: 20/20 correct in both formats, across all five target skills. No rule.

## Question

Claude Code supports a `[[skill-name]]` convention for referencing other skills. Does using it in a router/meta skill's body measurably improve routing or discovery accuracy versus just naming the skills in prose ("the deploy-release skill handles…")? If so, a rule could encourage bracket cross-references in `meta`-kind skills.

## Method

A fictional `meta` skill (`release-orchestrator`) routing to five sibling skills (`deploy-release`, `rollback-release`, `changelog-writer`, `incident-responder`, `maintenance-notice`). Two bodies, identical mappings and descriptions, differing only in reference style:

- **bracket**: "For cutting a new production release…: use `[[deploy-release]]`."
- **prose**: "For cutting a new production release…, the deploy-release skill handles it."

Five routing queries, each **deliberately phrased to require reading the description, not keyword-matching the skill name** — e.g. *"back out last night's deploy"* must route to `rollback-release` (not `deploy-release`, despite "deploy" appearing), and *"cut version 2.4.0"* to `deploy-release`. N=20 per format (40 trials), one query per agent, rotating through the five queries.

## Results

**40/40 correct — 20/20 in each format**, with a perfect per-query breakdown:

| Query (→ expected) | bracket | prose |
| --- | --- | --- |
| "back out last night's deploy" → rollback-release | 4/4 | 4/4 |
| "cut version 2.4.0" → deploy-release | 4/4 | 4/4 |
| "release notes for this sprint" → changelog-writer | 4/4 | 4/4 |
| "payments service is down" → incident-responder | 4/4 | 4/4 |
| "DB offline Sunday 2-4am" → maintenance-notice | 4/4 | 4/4 |

No audit ambiguity to resolve this time: grading was exact skill-name match, and every returned value was a legitimate skill name (no error strings, no confabulation) — directly verifiable in the checked-in `raw` array. The "trap" query (`deploy` appearing in a rollback request) was routed correctly 8/8 across both formats, confirming the model routed on meaning, not surface keywords, regardless of reference style.

## Verdict

**No accuracy advantage to `[[bracket]]` cross-referencing** over prose naming, for routing. This is consistent with the whole run of format findings: the model routes on the *description content*, and the syntactic wrapper around the skill name doesn't change that. No rule to encourage brackets on accuracy grounds.

Note this test measured *routing accuracy only*. The `[[skill-name]]` convention may still carry non-accuracy benefits this test doesn't cover — e.g. machine-parseability for tooling that builds a skill dependency graph (which is exactly what `no-broken-relative-links`-style tooling or a future skill-graph feature could use). If such a feature is ever built, brackets would matter for *the tooling*, not for the agent's routing — a different justification than the one tested here.

## Resulting rule

None. Brackets don't improve routing, so no rule requires or encourages them. (If a skill-dependency-graph feature is built later, a rule preferring parseable `[[refs]]` could be justified *on tooling grounds* — but that's a separate, tooling-driven rationale, not an agent-comprehension one, and isn't warranted today.)

## Caveats

- Five target skills, one domain, single model tier. A router with many more targets (20+), or weaker models, could differ — untested.
- Descriptions here were clear and mutually distinct. Brackets might help more when skill *names* must carry disambiguation weight because descriptions are terse or overlapping — not the case here.

## Reproduce

Router bodies at [`fixtures/meta-cross-reference/{bracket,prose}.md`](fixtures/meta-cross-reference/). Script (bodies inlined, no filesystem access needed): [`scripts/meta-cross-reference.workflow.js`](scripts/meta-cross-reference.workflow.js) — `Workflow({ scriptPath: … })`. The `summary` gives per-format, per-query correct counts; `raw` has every trial's chosen skill.
