# Multi-domain skills: does selection-logic format (table vs. prose) matter, and do agents hedge under ambiguity?

**Verdict: format doesn't matter for selection accuracy or cost here; and with an explicit "ask, don't hedge" instruction, agents never hedged (40/40, ground-truth-verified).** Resolves backlog [#4](backlog.md) (table vs. prose selection) cleanly, and [#6](backlog.md) (ambiguous-query hedging) **with an important scope caveat**: this test measured instruction *compliance*, not spontaneous behavior — see below.

## Question

The multi-domain pattern is `SKILL.md` holding variant-selection logic over one reference file per variant. Two open questions:
- **#4**: does phrasing that selection logic as a decision table vs. prose change how reliably the agent picks the right variant, or its token cost?
- **#6**: when a query is genuinely ambiguous between variants, does the agent hedge — open *all* the variant files "to be safe" — negating the token savings that motivate splitting per variant in the first place?

## Method

A fictional `multi-domain` skill (`cloud-deploy`) with three variant reference files (`aws.md`, `gcp.md`, `azure.md`), each a real deploy procedure with a distinct "do NOT" gotcha. Two `SKILL.md` variants, identical except for how the selection logic is written:

- **prose**: "Use the AWS reference when the request names AWS, Amazon, ECS… Use the GCP reference when…"
- **table**: a `| If the request names… | Read this reference |` decision table with the same keyword→file mapping.

**Both `SKILL.md` variants contained the same explicit instruction**: *"If the request does not clearly identify exactly one provider … do not guess and do not read every reference file. Ask the user which provider they mean."* (This instruction placement is exactly what makes the #6 result a compliance measurement — see caveat.)

Two query levels:
- **clear** (names exactly one provider, e.g. "Deploy to AWS ECS Fargate") — expected: pick it, open only its file.
- **ambiguous** (names a capability all three offer without the cloud, e.g. "Deploy to our managed Kubernetes cluster" → EKS/GKE/AKS all qualify) — expected: ask, open nothing.

**N=20 per cell**, 4 cells ({prose, table} × {clear, ambiguous}) = **80 trials**, one query per agent (clean per-query file-opening attribution), real `Read`-tool access.

## Results

**100% in every cell** — and, unusually, this one was cross-checked against ground truth rather than trusting self-reports:

| Cell | Outcome | Avg variant files opened |
| --- | --- | --- |
| prose · clear | 20/20 picked the correct provider, opened exactly 1 file | 1.0 |
| table · clear | 20/20 picked the correct provider, opened exactly 1 file | 1.0 |
| prose · ambiguous | 20/20 asked for clarification | 0.0 |
| table · ambiguous | 20/20 asked for clarification | 0.0 |

**Ground-truth audit** (parsing the 80 per-agent transcripts for actual `Read` tool calls on `references/{aws,gcp,azure}.md`, not the self-reported field): **40/40 ambiguous trials genuinely opened zero variant files**; **40/40 clear trials genuinely opened their one file**. The self-reported `variantFilesOpened` matched actual tool usage exactly — no confabulation. (The clear-query provider choices were correctly spread — aws×14, gcp×14, azure×12 — not collapsed to one default.)

**Token cost (#4)**: prose `SKILL.md` = 270 tokens, table = 265 tokens — a **1.9% difference, i.e. a wash**. This is unlike the [meta-dispatch finding](meta-dispatch-table-vs-prose.md) (table 21% cheaper) because there the prose carried repeated full-sentence *descriptions*; here the selection logic is a short keyword→file mapping both formats express compactly, so the table cuts almost no scaffolding.

## Verdict

**#4 — resolved.** For variant-selection logic, table vs. prose made **no difference** to selection accuracy (both 100% on clear queries) and **negligible difference** to token cost (~2%). The meta-dispatch table advantage does *not* transfer to short keyword-mapping selection sections — consistent with the general pattern that the table's benefit comes from cutting prose scaffolding, which a short mapping doesn't have. No rule: neither format is measurably better here.

**#6 — resolved, but narrower than posed.** The hedging risk did **not** materialize: with an explicit instruction to ask rather than read everything, the agent complied **40/40** (ground-truth-verified zero variant-file reads under ambiguity), identically across both formats. The intended token savings of per-variant splitting are **not** eroded by hedging *when the skill tells the agent not to hedge*.

**Critical caveat — what this did and didn't measure.** Both `SKILL.md` variants explicitly instructed the agent to ask rather than open every file under ambiguity. So this measured **compliance with that instruction**, which was perfect — *not* whether an agent spontaneously avoids hedging when given no such guidance. The honest, actionable takeaway is: **a multi-domain skill should include an explicit "if ambiguous, ask; don't read all variants" instruction**, because when present it's followed reliably. Whether that instruction is *load-bearing* (i.e. whether agents hedge without it) is the natural follow-up — see below.

## Resulting rule

None shipped yet — but this surfaces the first **candidate for a genuinely actionable rule** from the research so far: a `multi-domain`-kind skill's `SKILL.md` should contain an explicit ambiguity-fallback instruction. That's structurally detectable (does the body contain ask/clarify-on-ambiguity language near the selection logic?). **Deliberately not shipping it on this evidence alone**, because the counterfactual is untested: if agents don't hedge even *without* the instruction, the rule enforces ceremony for no benefit. Gating the rule on the follow-up test below, consistent with the project's "measure before enforcing" bar.

## Follow-up (added to backlog)

**Counterfactual for #6**: re-run the ambiguous condition with a third `SKILL.md` variant that has **no** ambiguity-fallback instruction. If agents still refrain from opening all variant files, the instruction is ceremony and no rule is warranted. If they hedge (open ≥2 variant files) without it, the instruction is load-bearing and `multi-domain-requires-ambiguity-fallback` becomes an evidence-backed rule.

## Caveats

- Single skill, single domain (cloud providers), one model tier. The clean compliance result may be capability-dependent; a Haiku/Sonnet/Opus split (as done for the tool-wrapper test) would strengthen it.
- Ambiguity here was "capability all three share" — one specific flavor. Other ambiguity types (e.g. a query matching two of three variants, or a near-synonym like "MariaDB" for a MySQL variant) could behave differently.
- The clear-query result replicates the [reference-split](reference-split-vs-consolidate.md) finding (disciplined single-file opening given clear per-variant descriptions), now also ground-truth-verified via transcripts rather than self-report.

## Reproduce

Fixtures (both `SKILL.md` formats + shared variant `references/`) at [`fixtures/multi-domain-selection/`](fixtures/multi-domain-selection/). Script: [`scripts/multi-domain-selection.workflow.js`](scripts/multi-domain-selection.workflow.js) — edit `PROSE_PATH`/`TABLE_PATH` to your checkout's absolute paths, then `Workflow({ scriptPath: … })`. The script's `summary` gives per-cell outcome counts and avg variant files opened; the `raw` array has every trial's chosen provider, clarification flag, and files-opened string. For the ground-truth audit, parse the per-agent transcripts in the run's transcript dir for `Read` calls on `references/*.md`.
