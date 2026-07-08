# Do the documented size thresholds (500-line body, 300-line reference TOC) hold up, and how do real skills actually structure reference content?

**Verdict: thresholds confirmed as documented; real-world practice adds a nuance the docs don't state (consolidate related content into one file rather than always splitting).**

## Question

The plugin already enforces a 500-line `body-max-length` and a 300-line `large-reference-toc` threshold, based on Anthropic's documented guidance. Two follow-ups: (1) does independent evidence corroborate these specific numbers, and (2) how do real, popular skills actually split body vs. reference content in practice — does documented guidance match observed behavior?

## Evidence

### Thresholds corroborated, but explicitly advisory

Both numbers are confirmed **verbatim and independently** across Anthropic's `skill-creator` reference skill and the official `code.claude.com/docs/en/skills` docs:

> "SKILL.md body: Target under 500 lines; approach this limit as a signal to add hierarchy" — [skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

A related closed GitHub issue ([anthropics/skills#202](https://github.com/anthropics/skills/issues/202)) confirms these are treated as **advisory, not hard caps** — it notes the `skill-creator` skill itself is 356 lines, "approaching the 500-line ceiling," and argues that's already too much context for a meta-skill about creating skills.

**Caveat, stated plainly: no source empirically shows these thresholds correlate with better comprehension or task success.** They're editorial heuristics from the people who designed the system, not outcome-tested benchmarks. Our rules should keep — and already do keep — these as configurable, not hard-coded, for exactly this reason.

### A real-world counter-example worth logging

Anthropic's own `skill-creator` — the most authoritative worked example available — keeps **one consolidated reference file** (`references/schemas.md`, ~430 lines) covering **seven distinct JSON schemas**, rather than splitting each schema into its own topic file. Verified directly via the GitHub file listing and raw content.

This matters because it's a data point *against* an intuitive "always split for token efficiency" instinct: the flagship example consolidates closely-related reference material into one file instead of maximizing splitting. This is exactly the shape of the open question in [Reference Hypothesis 1](backlog.md#reference) below — real practice doesn't obviously match the "split aggressively" intuition, so that hypothesis remains genuinely open, not a foregone conclusion.

### The taxonomy is officially narrower than what we built

Anthropic's own docs define exactly **two** content types — "Reference content" and "Task content" ([code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)). `multi-domain`, `tool-wrapper`, and `meta`/router are **not** named as distinct types anywhere in Anthropic's documentation — they're this project's own defensible extensions (already flagged as such in `docs/design/skill-taxonomy-and-rules.md`). This research pass re-confirms that framing rather than finding new official support for it.

### Claims that looked plausible but did not survive verification

Recorded so they don't resurface as "known facts" later:

| Claim | Verdict |
| --- | --- |
| Anthropic's document-manipulation skills (docx/pdf/pptx/xlsx) are cited as a canonical reference/tool-wrapper case study | **Refuted** (0-3) |
| An explicit "just-in-time retrieval" mandate directly underpins the skill-loading design | **Refuted** (0-3) |
| A Codex-CLI-specific 8 KB skill size cap exists as a comparable convention | **Refuted** (0-3) |
| SKILL.md should stay under ~5,000 words / ~800 lines | **Refuted** (0-3) — conflicts with, and loses to, the corroborated 500-line figure |
| `assets/` files are never loaded into context (zero token cost) unlike `references/` | **Refuted** (1-2, uncertain) |
| agent-dispatch's "2k vs 211k tokens" router-savings comparison | **Refuted** (0-3) |

## Verdict

Keep `body-max-length` (500) and `large-reference-toc` (300) exactly as configured — they're independently corroborated. Do **not** add a rule pushing authors to maximize file-splitting for reference content; the one real flagship example we have does the opposite (consolidation), so that remains an open, testable question rather than a default to enforce (see backlog).

## Resulting rule

None new. Confirms existing `body-max-length` / `large-reference-toc` defaults; no change warranted.
