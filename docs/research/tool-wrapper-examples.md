# Tool-wrapper: in-body vs. linked worked examples — first-attempt task success?

**Verdict: no correctness difference (120/120 both conditions, all 3 tiers); cost is conditional, same shape as the [flag-reference test](tool-wrapper-inline-vs-linked-flags.md).** Resolves backlog [#9](backlog.md). Worked examples placed in-body vs. in a linked file produced identical first-attempt success — because linked-condition agents reliably opened the file (60/60, ground-truth-verified). No rule.

## Question

Distinct from [#7](tool-wrapper-inline-vs-linked-flags.md) (which tested a flag *reference*): does providing full worked *examples* in-body (repeated cost every load) vs. linking to an examples file (cost only when opened) change **first-attempt task success**? The tradeoff: in-body examples are always present but always cost tokens; linked examples cost nothing until read — but only help if the agent actually reads them.

## Method

A `tool-wrapper` skill (`dbsync-wrapper`) for a fictional CLI whose correct syntax is **deliberately non-obvious and lives only in the examples**: masking columns uses `--mask` (not `--exclude`) and preview uses `--plan` (not `--dry-run`). The body explicitly says dbsync does *not* use the conventional flags and to follow the examples — so an agent that skips the examples and guesses conventional flags will produce a wrong command. Two conditions, identical example content:

- **inline**: examples in an `## Examples` section of `SKILL.md`.
- **linked**: examples in `references/examples.md`, linked from a terser `SKILL.md`.

Task: *"Copy the production.orders table to staging, masking the email and phone columns, and preview it without executing."* Correct answer: `dbsync copy production.orders staging --mask email,phone --plan`. **N=20 × 3 model tiers (haiku/sonnet/opus) × 2 conditions = 120 trials.**

## Results

**120/120 correct.** Every trial in every cell produced the exact correct command — a single distinct string across all 120 — with zero wrong or invalid:

| Cell | Correct | Opened examples file (self-report) |
| --- | --- | --- |
| haiku · inline / linked | 20/20 · 20/20 | 1* / 20 |
| sonnet · inline / linked | 20/20 · 20/20 | 0 / 20 |
| opus · inline / linked | 20/20 · 20/20 | 0 / 20 |

\* inline has no separate file to open; the lone "1" is a self-report artifact.

**Ground-truth audit** (actual `Read` calls in all 120 transcripts): **linked = 60/60 genuinely opened `references/examples.md`; inline = 0/60** (no such file exists there). Self-reports matched exactly. So the linked-condition agents got it right *by reliably following the link* — not by guessing correctly. The body's explicit "don't guess, dbsync doesn't use `--exclude`/`--dry-run`" steer was followed universally, in both conditions and all tiers.

### Token cost

| | Always-paid body | Examples (on demand) |
| --- | --- | --- |
| inline | 311 tokens | (in body) |
| linked | 193 tokens | 135 tokens |

- **Always-paid**: linked's body is 118 tokens (**−38%**) cheaper.
- **This task**: examples were required every time, so linked agents always opened the file → effective cost 193+135 = **328 vs. inline's 311 (+5.5%)** — linked is marginally *more* expensive when the examples are always needed.
- The crossover is identical in shape to [#7](tool-wrapper-inline-vs-linked-flags.md): linked wins whenever the examples are needed on fewer than ~90% of invocations. This task was built to need them 100% of the time (worst case for linked, by design).

## Verdict

**No first-attempt-success difference** between in-body and linked examples, at any of the three tiers. The hypothesized failure mode (agent skips the linked file and guesses wrong) **did not occur** — consultation was perfect (60/60, verified). Cost is the only differentiator, and it's the same conditional tradeoff as the flag-reference test: linked is cheaper for a wrapper whose typical task doesn't need the examples' fine print; in-body is marginally cheaper only if essentially every task needs them.

## Resulting rule

None. Like [#7](tool-wrapper-inline-vs-linked-flags.md), the right choice depends on how often a wrapper's real tasks need the examples — a query-pattern property a static linter can't infer. No correctness basis for a rule either way.

## Caveats

- The task was constructed so the examples are *always* load-bearing (correct syntax available nowhere else). That maximizes the chance of a linked-skip failure — and it still didn't happen, which strengthens the null. A skill where examples are merely nice-to-have would only make skipping *less* consequential, not more.
- Perfect consultation may be partly cued by the body's emphatic "don't guess, follow the examples" instruction. Whether a blander pointer yields the same 60/60 open rate is untested (parallels the [#6b](multi-domain-ambiguity-counterfactual.md) "is the instruction load-bearing" question — a possible follow-up, though the [#7] result with a plain pointer also showed near-universal consultation, so the instruction likely isn't essential).

## Reproduce

Fixtures at [`fixtures/tool-wrapper-examples/{inline,linked}/`](fixtures/tool-wrapper-examples/). Script: [`scripts/tool-wrapper-examples.workflow.js`](scripts/tool-wrapper-examples.workflow.js) — edit the two path constants, then `Workflow({ scriptPath: … })`. Ground-truth audit: grep the per-agent transcripts for `Read` calls on `references/examples.md`, bucketed by which `SKILL.md` (inline/linked) the prompt referenced.
