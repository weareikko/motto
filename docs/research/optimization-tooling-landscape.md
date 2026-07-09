# Should the linter add prompt/context optimization tooling? (caveman, Headroom, LLMLingua, DSPy)

**Verdict: no optimization *engine* belongs in the linter — but the landscape independently validates the project's format-cost rules.** A multi-source research pass (106 verified agents; peer-reviewed LLMLingua/DSPy sources plus the two anchor tools) draws a clean line: aggressive prompt optimization is model-in-the-loop and needs an eval harness to prove behavior is preserved — a static linter can't do that and shouldn't pretend to. What a linter *can* legitimately do is exactly what this project already does: flag statically-detectable, behavior-preserving **format** inefficiencies with a measured token delta.

## The two anchor tools — both orthogonal to a SKILL.md linter

**caveman** ([JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)) is not a prompt compressor. It's a Claude Code *skill* that reshapes the agent's **output** style (drop filler, use fragments, never touch code/commands/errors) for ~65% fewer *output* tokens. It optimizes what the agent *says*, not what it *reads* — and it *adds* ~1–1.5k input tokens per turn (the skill body itself). Its 65% figure is a self-reported, session-log post-hoc measurement, not an independent audit. **Relevance to us: none for linting SKILL.md bodies** — it's an output-verbosity tool. If a team wants terser agent output, recommend caveman *as a skill*, not as a linter rule.

**Headroom** ([headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)) is a **runtime** compressor for machine-generated context — tool outputs, logs, files, RAG chunks, conversation history — *before* it reaches the LLM, via a HuggingFace model (`Kompress-v2-base`, a ModernBERT token classifier trained on agentic traces) plus AST-aware code compression. Claims 47–92% input reduction, but the key detail: **savings scale with input bloat** (47% on dense code exploration, 92% on redundant search/log output), and near-parity accuracy holds only at *low* (19–32%) compression, not the 60–95% headline. It never touches authored instruction text. **Relevance to us: none for linting** — it's a runtime layer on dynamic content a static linter can't even see. For runtime context bloat, recommend Headroom rather than reimplementing.

## The credible research family confirms the boundary

- **LLMLingua / LLMLingua-2** (Microsoft, peer-reviewed): lossy prompt compression is *fundamentally model-in-the-loop* — original LLMLingua uses a small LM's perplexity to drop low-information tokens (up to 20×); LLMLingua-2 is a trained BERT-level token classifier distilled from GPT-4 (2–5× at ~99% task retention). **None of this is achievable with static text heuristics.**
- **The gains come from redundancy in verbose contexts** (few-shot, CoT, multi-doc RAG, long transcripts) — up to 20×. Summarization/conversation only reach 3–9×. **This directly implies prompt compression is largely irrelevant to tight SKILL.md bodies**, where there's little redundancy to remove — a concise instruction file is already near the floor.
- **DSPy / MIPROv2**: prompt *optimization* frameworks are model-in-the-loop optimizers **gated on a required eval metric + validation set**. DSPy explicitly requires "a metric and a baseline evaluation" to define "better." Optimization always runs an iterative model loop, never static text analysis.

## The decisive methodological finding (validates our whole thesis)

**Counting input-token reduction does NOT prove cost or behavior preservation.** Aggressive compression can *increase* total cost via output-token explosion — one 2026 preprint measured ~56× output expansion on MBPP at compression ratio 0.3 (vs ~5× on HumanEval), i.e. the effect is benchmark/structure-dependent, not provider-inherent. This is *exactly* the pattern our own tag-steps finding hit in miniature (a "structure" that looked reasonable cost more for no benefit). Consequently, **every credible tool in this space validates behavior with multi-benchmark, in- and out-of-domain eval suites + faithfulness metrics — not token counts.** (LLMLingua-2 validates on MeetingBank, LongBench, ZeroScrolls, GSM8K, BBH with Variation Rate, Alignment Gap, and prompt-reconstruction tests.)

That is the "measure before enforcing" thesis, arrived at independently by the state-of-the-art tooling. And it requires an **eval harness** — which is precisely why this project built [`evals/`](../../evals/) as a *separate* subsystem from the linter, rather than baking optimization into lint rules.

## Recommendation for `@ikko-dev/eslint-plugin-skill`

**Linter-appropriate** (static, deterministic, behavior-preserving — and matching our own measured findings):
- Flag known token-inefficient **format** choices with a measured delta: XML/tag-heavy step markup vs. markdown lists (our N=20+ trials: **+23–31% tokens, zero comprehension gain**), prose-vs-table for routers (**−21% tokens, no accuracy change** → already shipped as opt-in `meta-prefers-dispatch-table`).
- Flag duplicated instruction blocks / boilerplate (already partly covered by the cross-skill `skill-check-refs` dedup command).
- *Optionally* flag measurable filler (pleasantries, "just/really/basically") — **warn-level, with the token delta, never a silent rewrite**. (Untested by us; would warrant its own research entry before shipping, and the expected saving on already-concise bodies is small.)

**NOT a linter's job** (needs a trained model and/or an eval harness to prove behavior is preserved):
- Any lossy compression, token-dropping, or instruction rewriting (LLMLingua / DSPy-style). A static linter cannot prove the rewrite preserves behavior, and the output-explosion finding shows blind cutting can backfire.

**Recommend existing tools instead of reimplementing**: Headroom for runtime context bloat; caveman (as a skill) for output verbosity. Neither overlaps a SKILL.md linter's remit.

## How this closes the project's arc

Our format-research program concluded that agents are robust to format and a linter's value is *structural correctness + cost-only nudges*. This external landscape review corroborates it from the opposite direction: the serious optimization tools all (a) target bloat we don't have (runtime context, verbose RAG), (b) are model-in-the-loop, and (c) gate on eval harnesses. The one thing a linter *can* soundly own — flagging format choices with a measured, behavior-preserving token delta — is exactly the niche the shipped rules occupy. **No new engine to build; the boundary is confirmed.**

## Caveats

- caveman's 65% and Headroom's 47–92% are **self-reported vendor/author benchmarks**, not independently reproduced; both are young (2026), fast-moving repos.
- The output-token-explosion / Compression-Robustness-Index result is a **single-author, non-peer-reviewed preprint** (arXiv:2603.23527) — corroborated in direction but medium-confidence. The LLMLingua/DSPy claims rest on peer-reviewed primary sources (high-confidence).
- A "flag filler words" rule is plausible but **untested here**; the evidence says its payoff on already-concise SKILL.md text is small, so it should clear its own empirical bar before shipping rather than be assumed.

## Sources

Anchor tools: [caveman](https://github.com/JuliusBrussee/caveman), [Headroom](https://github.com/headroomlabs-ai/headroom) + [docs](https://headroom-docs.vercel.app/docs). Research: [LLMLingua](https://arxiv.org/html/2403.12968v2) / [LLMLingua-2](https://www.microsoft.com/en-us/research/publication/llmlingua-2-data-distillation-for-efficient-and-faithful-task-agnostic-prompt-compression/) (Microsoft), [DSPy MIPROv2](https://dspy.ai/api/optimizers/MIPROv2/) + [metrics](https://dspy.ai/learn/evaluation/metrics/), compression-cost preprint [arXiv:2603.23527](https://arxiv.org/pdf/2603.23527), [Anthropic context-engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
