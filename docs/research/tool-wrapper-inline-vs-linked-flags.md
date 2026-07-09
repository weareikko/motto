# For a tool-wrapper skill, does inlining the flag reference vs. linking to it change correctness or cost?

**Verdict: no measured correctness difference; a quantified, conditional cost tradeoff.** Resolves backlog hypotheses [#7 and #9](backlog.md#tool-wrapper). Two methodology bugs were found and fixed mid-investigation — documented in full below because they're instructive, not just a footnote.

## Question

A tool-wrapper skill's body loads on every invocation; a linked `references/` file loads only when opened. Does inlining a CLI tool's full flag reference (always paid) vs. linking to it (paid only on consultation) change (a) whether the model correctly handles a documented flag constraint, and (b) net token cost?

## Method

A fictional CLI (`snapctl`) with 10 flags, including a genuine documented gotcha: `--compress` and `--verify` are mutually exclusive ("integrity verification is not supported on compressed snapshots"). Two fixtures, identical in substance:

- **Inline**: full flag reference, including the constraint, directly in `SKILL.md`.
- **Linked**: a short `SKILL.md` body linking to `references/flags.md`, which carries the same full reference.

Task (deliberately *not* hinted to look for a conflict, to avoid an artificial ceiling): *"Create a compressed, tagged snapshot of /data using gzip, verify its integrity afterward, retaining the 5 most recent snapshots."* — a request that requires the constraint detail to answer safely, since it asks for both conflicting flags.

Given fresh instances (with real `Read` tool access to the actual fixture files) across **3 Claude tiers** (Haiku, Sonnet, Opus) × **2 formats** × **N=20 trials each** = 120 trials, asked for the exact command plus a self-reported "did you open a separate reference file" flag.

## Two bugs found and fixed mid-investigation

**Bug 1 — invalid run, fully discarded.** The first attempt passed the fixture paths via the Workflow tool's `args` parameter as an object literal, exactly as documented. Inside the script, `args` arrived as a JSON-encoded *string*, not an object — so `args.inlinePath` silently evaluated to `undefined` (property access on a string doesn't throw) rather than raising an error. Every one of 120 trials was told to read a file at the literal path `"undefined"`, ran to completion over ~70 minutes, and burned ~4.5M tokens before the bug was caught by manually inspecting the completed raw output. **Fix**: hardcode stable paths directly in the script body rather than round-tripping them through `args`. **Process fix**: for any future large-N workflow, check `journal.jsonl` a few minutes after launch (or run a tiny pilot first) instead of waiting for full completion — this specific bug would have been visible in the first 60 seconds.

**Bug 2 — grading logic, corrected before reporting.** After the fix, the raw results looked wildly different by model tier (Haiku "78% accurate," Sonnet "6–0%," Opus "0%"), which was surprising enough to warrant checking rather than reporting. The automated grader flagged a response as `missed_conflict` whenever both `--compress` and `--verify` appeared anywhere in the response text — but Sonnet and Opus overwhelmingly used both flag names *while explaining the conflict and offering two separate, safe single-flag alternatives* (e.g. *"`--compress` and `--verify` are mutually exclusive... use `--compress gzip --tag <name> --retain 5` (no verify) OR `--verify --tag <name> --retain 5` (no compression)"*) — a textbook-correct response the naive substring check couldn't distinguish from an actual single command combining both flags. Manually read all 118 valid raw responses end-to-end to confirm: **zero** contained a real single command combining both flags as an intended answer.

## Corrected results

**Correctness: 100% across the board.** No model, in either format, ever produced a command that actually combines `--compress` and `--verify`. Format made no measurable difference to correctness — consistent with the null result from the [tag-structured-steps](tag-structured-steps.md) and [meta-dispatch](meta-dispatch-table-vs-prose.md) investigations: this is the third test in a row where the hypothesized comprehension risk did not materialize.

**A real secondary finding — model tier, not format, drives transparency:**

| Model | Explicitly surfaced the conflict + gave alternatives | Silently picked one flag, no mention |
| --- | --- | --- |
| Haiku (inline) | 4/20 (20%) | 14/20 (70%) |
| Haiku (linked) | 5/19 (26%) | 13/19 (68%) |
| Sonnet (inline) | 16/20 (80%) | 1/20 (5%) |
| Sonnet (linked) | 20/20 (100%) | 0/20 |
| Opus (inline) | 19/19 (100%) | 0/19 |
| Opus (linked) | 19/20 (95%) | 0/20 |

Haiku usually resolved the conflict by silently keeping `--compress` and dropping `--verify`, without telling the user a requested flag was omitted. Sonnet and Opus almost always surfaced the conflict explicitly and offered a choice. This is a real, monotonic-by-tier pattern — but it's a **model capability trait**, not a skill-authoring format choice, so it doesn't translate into a lint rule (a skill author can't control which model runs their skill). Logged here as an observation for awareness, not turned into a rule.

**Reference consultation: near-universal when genuinely needed.** Self-reported consultation in the linked condition: Haiku 19/19, Sonnet 20/20, Opus 20/20 — every model reliably followed the link when the task required the detail.

### Token cost (measured with `@anthropic-ai/tokenizer`)

| | Inline | Linked (body only) | Linked (body + reference, if read) |
| --- | --- | --- | --- |
| Tokens | 303 | 100 | 326 |

- **Always-paid cost**: linked's body is 203 tokens (67%) cheaper than inline, paid on *every* invocation regardless of whether the task needs the detail.
- **Break-even**: linked stays net-cheaper as long as the reference is consulted on fewer than ~90% of invocations (203/226 ≈ 0.90). Above that, linked is slightly *more* expensive (326 vs. 303, +7.6%) due to the reference file's own overhead.
- This test deliberately picked a task requiring the constraint, which is why consultation came in near 100% — a worst case for linked's cost efficiency, by design. A tool-wrapper with many flags where any single task typically needs only a handful will see consultation well under 90% in practice, favoring linked on average.

## Verdict

**No correctness difference between inline and linked** — both are safe, at all three model tiers tested. **Cost is genuinely conditional**: linked wins on average (most invocations won't need every flag's fine print) but can be a slight net loss for tasks that specifically require the documented edge case, which is exactly the scenario this test targeted.

## Resulting rule

None new. This doesn't cleanly map to a structural, low-false-positive rule the way the meta-dispatch finding did — "should this tool-wrapper inline or link its flags" depends on the tool's actual flag count and the skill's typical task mix, which isn't something a static linter can infer. No change to the existing rule set.

## Caveats

- Single scenario (one fictional CLI, one constraint, one task). Both bugs above are a reminder that a surprising empirical result should be checked before being trusted, not just reported.
- The "silently drops a flag" behavior wasn't graded as a first-class structured field — it was inferred from free text after the fact. A dedicated follow-up test that puts this directly in the response schema (e.g. `explicitlyFlaggedConflict: boolean`) would measure it more cleanly.
