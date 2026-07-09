# Skill research evals

A standalone, **multi-harness × multi-model** eval harness (built on [`vitest-evals`](https://github.com/…)) for re-running the project's [research benchmarks](../docs/research/) outside the Claude Code workflow tool — so a finding can be re-checked across agent implementations (Claude Code, Pi, OpenCode, Codex) and across models/judges.

This is **dev tooling, not shipped** (`evals/` is excluded from the published package). It complements — doesn't replace — the reproduction `Workflow` scripts in [`docs/research/scripts/`](../docs/research/scripts/), which run the same benchmarks via the internal agent-workflow tool.

## Why it exists

The research log's findings were produced with the Claude Code internal workflow tool (one model family, one harness). This subsystem lets the same benchmark run through *any* installed agent CLI at *any* model, with an independent judge — the natural way to test whether a finding generalizes beyond Claude, per the project's "measure, don't assume" thesis.

## Layout

- `harness/` — one adapter per agent CLI (`claude`, `pi`, `opencode`, `codex`), each with `detect()` (binary + credential gating) and headless `run()`. `claude` and `pi` adapters are validated against installed binaries; `opencode`/`codex` are written to their documented CLI surface but **unverified** (flagged in code) until those binaries are present.
- `judge/llm-judge.ts` — dependency-free LLM judge via Cloudflare AI Gateway (a *different* model can score the answer, avoiding self-preference).
- `runner.ts` — reusable cross-harness × cross-model benchmark runner (N trials → comparable accuracy rows).
- `config.ts` — model sweep + the `RUN_EVALS=1` master switch.
- `*.eval.ts` — one benchmark per file, using `describeEval`; a suite is generated per *available* harness.

## Running

Evals are **opt-in** — they call real agents and cost money. Nothing runs under `npm test` (unit RuleTester specs; evals are `*.eval.ts`, collected only by the separate config).

```sh
# Zero-cost: see what's runnable right now (binaries + credentials)
npm run evals:list

# Run the evals (only available harnesses execute; others skip)
RUN_EVALS=1 npm run evals

# Sweep specific models per harness
RUN_EVALS=1 EVAL_MODELS="claude=claude-opus-4-8,pi=anthropic/claude-sonnet-5" npm run evals
```

### Credentials

Each harness gates on its own binary + a provider key in env (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`/etc. for Pi, `OPENAI_API_KEY` for Codex, …). The LLM judge needs `CF_AI_GATEWAY_URL` + `CF_AI_GATEWAY_TOKEN` (+ optional `EVAL_JUDGE_MODEL`). Missing credentials → that harness/judge is skipped with a stated reason, never a false pass.

## Status

Foundation, first benchmark ported (`reference-split.eval.ts`). Adding a benchmark = one `*.eval.ts` reusing the harness adapters; porting the rest of the research log is incremental. `opencode`/`codex` adapters need a validation pass against real binaries before their green runs are trustworthy.
