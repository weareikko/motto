# @weareikko/motto

Evaluate a [Claude Code Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) against **its own `description` contract**. A skill's frontmatter `description` is the only machine-readable promise it makes — what it does, and when to use it. `motto` reads that promise and tests it: does the skill *trigger* when it says it will, *do* what it claims, and at what *token cost*?

The wedge is that this contract is free. You don't write eval cases; `motto` derives them from the `description` the author already committed to.

```
skill: incident-runbooks [reference]

cost (Claude tokenizer)
  index          33 tok  — name+description, loaded every request
  body          109 tok  — SKILL.md body, loaded on trigger
  references  1,075 tok  — on demand across 3 file(s)
  worst case  1,233 tok  — SKILL.md + all references read

contract (derived from description)
  claim: On-call runbooks for common production incidents (database, network, auth outages)
  triggers (2): investigating · responding to an active incident

behavioral (trigger + claim fidelity)
  claude    trigger 18/20 fired (90%)
            claim   17/18 fulfil claim (94% of fired)
```

## Install

```sh
npm i -g @weareikko/motto   # (not yet published — see Status)
```

## Commands

```sh
motto eval <skill>        # cost + contract (always) + behavioral (when a harness is present)
motto eval <skill> --cost-only    # deterministic only: no agent runs, no credentials
motto contract <skill>    # print the contract derived from the description
motto bench <skill...> --models <ids>   # sweep trigger fidelity across skills × models × priors. SPENDS.
motto doctor              # which harnesses + judge are runnable right now (zero cost)
motto mcp                 # run motto's deterministic tools (cost, contract, band) as an MCP stdio server
```

`<skill>` is a skill directory or a `SKILL.md` path. Flags on `eval`: `--harness <ids>` (comma-separated), `--model <id>`, `--n <trials>` (default 20), `--json`.

## `motto bench` — cross-model × prior trigger-fidelity sweep

Where `motto eval` measures one skill against one harness, `motto bench` sweeps the **router-mode** trigger probe (`measureTriggerRouter`, same probe `eval`'s behavioral runner uses) across every (skill × model × prior) cell you ask for, deriving each skill's positive prompts from its own description contract. Each cell's fire rate is banded via `motto`'s Wilson-interval stats (`skill_cost`/`skill_contract`/`score_band` under the hood), so results read as a rate + confidence band, never a bare pass/fail.

```sh
motto bench skills/a skills/b --models=cloudflare-ai-gateway/claude-haiku-4-5,cloudflare-ai-gateway/claude-fable-5 \
  --priors=baseline,calibration,orchestration --n=5 --max-prompts=2
```

`--models` is required: comma-separated `provider/modelId` specs (same notation as `eval --model`). `--priors` defaults to `baseline,calibration,orchestration`; `--n` (trials per cell) defaults to 5; `--max-prompts` (positive prompts swept per skill) defaults to 2. `--json` emits the structured `BenchReport` instead of the text table.

**This is a spend command** — it makes one live model call per trial (`totalCalls` in the report is exactly that count) and gates on `motto doctor`-equivalent credential detection before making any call. The sweep logic itself (`packages/motto/src/bench/`) is exercised deterministically in CI against a fake agent factory — zero network calls, zero spend — and only a human running `motto bench` for real against live credentials produces live numbers.

## The three metrics

- **cost** — deterministic, zero-credential, **works everywhere**. Token cost is paid in three tiers with very different frequencies: the `name: description` *index* entry loaded on **every** request, the SKILL.md *body* loaded when the skill triggers, and each *reference* loaded only if the agent opens it (progressive disclosure). `motto` measures all three with Claude's tokenizer, so a bloated description — the most expensive kind of bloat — is visible immediately.
- **trigger fidelity** — needs agent runs. For each positive prompt derived from the description's "use when …" cue, does the agent actually engage the skill? Reported as a fire rate over N trials, never a single pass/fail.
- **claim fidelity** — needs runs **and** an LLM judge. On the runs where the skill fired, does the output do what the `claim` says? Scored 0/1 by an independent judge model.

Cost and contract derivation are deterministic (no model, no spend). Behavioral metrics cost money and **self-skip cleanly** when a harness / judge / `RUN_EVALS=1` is absent — never a false pass. Run `motto doctor` to see what's available.

## Credentials

Behavioral metrics run on real agent CLIs and an LLM judge. Copy [`.env.example`](../../.env.example) to `.env` (gitignored, auto-loaded). Each harness gates on its own binary + a provider key; the judge uses the Cloudflare AI Gateway three-var convention (`CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_GATEWAY_ID`, + optional `EVAL_JUDGE_MODEL`) shared with the other @weareikko projects.

## Multi-harness eval library

Under the CLI is a reusable **multi-harness × multi-model** eval library (the `evals/` suites, built on [`vitest-evals`](https://github.com/getsentry/vitest-evals)) for re-running the project's [research benchmarks](../../docs/research/) across agent implementations and models/judges.

- `harness/` — one adapter per agent CLI (`claude`, `pi`, `opencode`, `codex`), each with `detect()` (binary + credential gating) and headless `run()`. `claude`/`pi` are validated against installed binaries; `opencode`/`codex` are written to their documented CLI surface but **unverified** (flagged in code) until those binaries are present.
- `judge/llm-judge.ts` — dependency-free LLM judge via Cloudflare AI Gateway.
- `runner.ts` — cross-harness × cross-model benchmark runner (N trials → comparable accuracy rows).
- `*.eval.ts` — one benchmark per file; a suite is generated per *available* harness.

```sh
npm run evals:list                 # zero-cost availability check
RUN_EVALS=1 npm run evals          # only available harnesses execute; others skip
RUN_EVALS=1 EVAL_MODELS="claude=claude-opus-4-8,pi=anthropic/claude-sonnet-5" npm run evals
```

## Status

Cost + contract derivation ship and are fully tested (deterministic, no spend). The behavioral runner (`trigger`/`claim` fidelity) is structurally complete and gated, but its live `filesRead`/judge wiring has **not** been validated end-to-end against real harness output — treat first live numbers as suspect until confirmed. Contract derivation is deterministic/templated for the MVP; a `--generate` mode (model-authored natural prompts + adjacent-out-of-scope negatives) is planned. Package stays unpublished (`private: true`) until behavioral metrics are validated on live runs.
