# Skill taxonomy & rule design (research-backed)

Status: proposal. Informs the roadmap for `@ikko-dev/eslint-plugin-skill`.

This document synthesizes a multi-source research pass (Anthropic official docs, the `agentskills.io` open standard, the `anthropics/skills` repo incl. `skill-creator`, community collections, and academic agent-skill/memory literature) into (a) verified findings and (b) a concrete plan for taxonomy-aware rules and cross-skill reference de-duplication.

## 1. Verified findings

Confidence tags: **[H]** high (3–6 concurring primary sources, adversarially verified), **[S]** synthesis/design inference.

### Frontmatter & routing
- **[H]** Exactly **two required** frontmatter fields: `name` and `description`. `name` ≤ 64 chars, lowercase `a-z0-9` + hyphens only, no leading/trailing/consecutive hyphens, no XML tags, no reserved words (`anthropic`/`claude`), and **must match the parent directory name**. `description` non-empty, ≤ 1024 chars, no XML tags. `license`, `compatibility`, `metadata`, `allowed-tools`, `when_to_use`, `disable-model-invocation` are **optional** (must not be flagged as unknown). — Anthropic best-practices, agentskills.io/specification, code.claude.com/skills.
- **[H]** `description` is the **primary routing/trigger signal**: it must state **what** the skill does AND **when** to use it (specific triggers/keywords/contexts), written in third person, key use case first. All "when to use" info belongs in the description, not the body. Anthropic advises deliberately "pushy" descriptions to counter undertriggering. Vague descriptions ("Helps with documents") are an explicit anti-pattern. The combined `description` + `when_to_use` shown in the skill listing is truncated at **1,536 chars** (configurable default `skillListingMaxDescChars`). — Anthropic best-practices, code.claude.com, skill-creator, agentskills.io.

### Body
- **[H]** The body has **no format restrictions and no required H1** — only `name`/`description` are required. A rule requiring an H1 would be **wrong**. Keep the body **< 500 lines / < ~5000 tokens**; a loaded body stays in context across turns, so every line is a recurring token cost. Crossing ~500 lines is the explicit signal to split content into reference files. — agentskills.io, code.claude.com, best-practices, skill-creator.
- **[H]** **Three-level progressive disclosure**: (1) metadata `name`+`description` (~100 tokens, always loaded), (2) body (on trigger), (3) bundled resources (on demand, no cost until read). This is the architectural rationale for conciseness + reference splitting.

### Reference files & bundle layout
- **[H]** Reference files must be **one level deep** from `SKILL.md` (every reference links directly from `SKILL.md`); nested reference chains are an anti-pattern because Claude may only partially read (`head -100`) files reached indirectly.
- **[H]** Conventional (all **optional**) bundle dirs: `scripts/` (executable), `references/` (docs loaded on demand), `assets/` (templates/output). Reference files should be **linked explicitly** from `SKILL.md`, **named descriptively** (`form_validation_rules.md`, not `doc2.md`), kept focused, organized by domain; files > 300 lines should carry a table of contents. Note: layout is a **recommended convention, not hard-enforced** — Anthropic's own examples sometimes place `FORMS.md`/`REFERENCE.md` at top level, so a rule that *requires* a `references/` dir would false-positive.

### Taxonomy basis
- **[H]** Claude Code officially distinguishes two **content types**: **Reference content** (conventions, style guides, domain knowledge, applied inline) vs **Task content** (step-by-step actions, often invoked as `/skill-name`, optionally gated with `disable-model-invocation: true`). This maps to a reference/knowledge KIND vs a procedural/task KIND.
- **[H]** Multi-domain skills split per-variant reference files (`references/{aws,gcp,azure}.md`) with `SKILL.md` holding workflow + selection logic — a structural signal for a distinct "multi-domain reference" KIND.

### Cross-skill sharing — the gap
- **[H]/[S]** All sources describe reference organization **within a single skill** and are **silent on sharing reference content across skills** — no `shared/`, symlink, or import mechanism is documented. The one-level-deep + self-contained-bundle model actively pushes authors to **copy** files into each skill, which is exactly what produces duplication and drift. **Cross-skill de-duplication is therefore an uncovered gap the linter can legitimately own.**

## 2. What this means for the current plugin

| Current rule | Verdict from research |
| --- | --- |
| `no-multiple-h1` (don't require an H1) | ✅ **Validated** — no required H1; only flag duplicate H1s. |
| `name-matches-dir` | ✅ Validated — name must equal parent dir. |
| `name-kebab-case` | ✅ Validated — but **tighten**: add max-64-length and reserved-word (`anthropic`/`claude`) checks. Current regex already blocks leading/trailing/consecutive hyphens. |
| `description-length` (≤1024) | ✅ Validated — 1024 is the hard field cap. |
| `description-no-html` | ✅ Validated — no XML/HTML tags. |
| `description-has-trigger` | ✅ Validated — description must encode *when*. |
| `body-max-length` (≤500 lines) | ✅ Validated — keep configurable (thresholds are soft). |
| `no-broken-relative-links` | ✅ Validated. |
| `h1-matches-name` (opt-in) | ✅ Correctly opt-in — not a standard requirement. |

New **universal** rules the research justifies (see §4).

## 3. Proposed skill taxonomy

Five KINDs. (a)–(c) are grounded in primary sources; (d)–(e) are defensible extensions. **[S]**

| KIND | What it is | Detection signals |
| --- | --- | --- |
| `procedural` (task/workflow) | Step-by-step actions (deploy, commit, codegen) | imperative/numbered body; `disable-model-invocation: true`; `/skill-name` intent; `scripts/` present |
| `reference` (domain-knowledge) | Declarative knowledge applied inline | `references/`-heavy; declarative body; style-guide/convention language |
| `multi-domain` | Workflow + selection over per-variant refs | `SKILL.md` selection logic + several sibling `references/*.md` variants |
| `tool-wrapper` | Thin wrapper over a tool/API | `allowed-tools` set; short body |
| `meta` (router) | Orchestrates/points to other skills | references other skills; e.g. `skill-creator` |

**Type resolution:** support an **explicit declaration** in frontmatter (`metadata.kind: procedural`) that **overrides** auto-detection; otherwise **auto-detect** from the signals above and treat as advisory (never hard-fail on a guessed type).

## 4. Rule partitioning

### Universal (every KIND)
Existing: `require-frontmatter`, `name-kebab-case` (+ max-64, +reserved-words), `name-matches-dir`, `description-length`, `description-no-html`, `description-has-trigger`, `no-multiple-h1`, `no-broken-relative-links`, `body-max-length`.

New (research-justified):
- `refs-one-level-deep` — flag reference links that resolve to files more than one level below `SKILL.md`.
- `no-orphan-references` — every file under `references/` should be linked from `SKILL.md` (and every relative link should resolve — the inverse of `no-broken-relative-links`).
- `descriptive-reference-filenames` — flag `doc2.md`, `ref1.md`, `untitled.md`, etc.
- `large-reference-toc` — reference files > 300 lines should contain a table of contents.
- `no-unknown-frontmatter-keys` — allowlist the spec's known keys; flag typos (`descriptoin`) but **not** the valid optional keys.

### Type-specific (keyed to KIND; only when confidently detected/declared)
- `procedural`: expect imperative/numbered steps; suggest `disable-model-invocation: true` if invoked as a command.
- `reference`: expect a populated `references/` and declarative body; warn if the body is a thin stub with no knowledge.
- `multi-domain`: expect selection logic in `SKILL.md` + ≥2 variant files.
- `tool-wrapper`: validate `allowed-tools` entries.

### Collection-level (cross-file — the novel tier)
See §5. This is **not** a per-file ESLint rule.

## 5. Cross-skill reference de-duplication

Grounded in the observed CRO case: `ga4-funnel-performance` and `ga4-shopify-gap` each ship their own `references/` and share **three byte-identical** files (`ga4-setup.md`, `property-resolution.md`, `runtime-defaults.md`) plus **two same-named-but-divergent** files (`ga4-query.md`, `output-template.md`).

**Two distinct findings, different severities:**
1. **Byte-identical across skills** → *maintenance burden* (single-source-of-truth violation). **warn** — suggest consolidating into a shared location.
2. **Same filename, divergent content** → *silent correctness hazard* (the copies forked; a fix to one won't reach the other). **error/high** — reconcile or rename.
3. *(optional)* **Near-duplicate** (different names, high normalized similarity) → *possible copy that should be shared*. **warn**, off by default.

### Architectural note — why this is NOT an ESLint rule
ESLint (and oxlint) process files **independently**; a per-file rule cannot reliably "see all other skills," and faking it with module-level state is order-dependent and breaks under `--cache`/parallelism. Cross-skill duplication is a **repo/collection-level analysis**.

**Decision: evaluate existing tooling before building bespoke.** Candidates to assess for cross-file duplicate/near-duplicate detection over `references/**/*.md`:
- **jscpd** — copy/paste detector; language-agnostic (tokenizes any text incl. markdown), reports duplicate blocks across files with a similarity threshold, has a JSON reporter and CI mode. Closest fit for "same/near-same content across files."
- **semgrep** — powerful for code *pattern* matching, but oriented at AST patterns per language; weaker fit for "these two markdown docs are ~identical," and markdown support is limited. Assess but likely not ideal.
- **PMD CPD** / **similarity-ts** / plain content-hashing — CPD is the classic token-based clone detector; a normalized content-hash pass is trivial to build if no tool fits cleanly.

The spike (P2 below) will benchmark jscpd (+ a hash pass) against the CRO case and pick: adopt a tool, wrap a tool, or build a thin analyzer. Whatever the engine, the wrapper groups by **scope boundary** (default: enclosing plugin dir), classifies findings as byte-identical vs same-name-divergent vs near-duplicate, and supports an **allowlist** for deliberate divergence.

**Spike result:** ran `npx jscpd --pattern "**/references/*.md" --min-tokens 20` against the real CRO `references/` trees. It works (found 10 clones, 19% duplicated lines) but reports **line-level clone fragments** from a generic tokenizer — it doesn't classify at the granularity this needs (a whole reference file that's byte-identical to another vs. one that's the same *name* but has drifted vs. two unrelated near-similar files). Getting that 3-way classification out of jscpd's clone-report shape would mean post-processing its output into something more complex than just computing it directly. `semgrep` wasn't trialled — not installed, requires a separate Python toolchain, and per the research phase is AST-pattern-oriented per language with weak markdown support, a poor fit for "these two docs are ~identical."

**Decision: build a thin native analyzer** (`node:crypto` hashing, zero new runtime deps) rather than adopt or wrap a tool. It directly computes the three-tier classification below with exact control over severity and normalization, and stays consistent with this package's "minimal dependencies" convention.

## 6. Decisions

1. **Dedup scope boundary** — **resolved (PR 3):** default is the plugin dir (parent of the nearest ancestor literally named `skills`), matching sibling skills under one `plugins/<x>/skills/*`. `--scope=repo` opts into comparing every discovered skill in one global scope.
2. **Type resolution** — open; deferred to PR 4 (taxonomy).
3. **Near-duplicate detection** — **resolved (PR 3):** shipped as opt-in (`--near-duplicates` / `{ nearDuplicates: true }`), off by default, using word-shingle Jaccard similarity with a configurable threshold (default 0.75).
4. **Deliverable form for cross-skill checks** — **resolved (PR 3):** a separate CLI (`skill-check-refs`) + library export (`@ikko-dev/eslint-plugin-skill/dedup`), not an ESLint rule (see the architectural note above) and not a test-runner-shaped audit.
5. **Deliberate-divergence escape hatch** — **resolved (PR 3):** `--ignore=<filename,...>` / `{ ignoreRelPaths: [...] }`, keyed by reference filename.

## 7. Delivery plan (one PR at a time)

Each PR is opened for review, merged, then the next begins.

- **PR 1 — frontmatter hardening:** tighten `name-kebab-case` (max-64 + reserved words `anthropic`/`claude`); add `no-unknown-frontmatter-keys` (allowlist the spec's keys, catch typos). Stays within the existing `SKILL.md` scope. Ships this design doc.
- **PR 2 — reference-file linting:** extend the preset to lint `references/**/*.md`; add `refs-one-level-deep`, `no-orphan-references`, `descriptive-reference-filenames`, `large-reference-toc`. Answers "lint reference files too."
- **PR 3 — cross-skill dedup:** evaluated jscpd (spiked against the real CRO plugin) and semgrep; built a thin native analyzer instead (see spike result above). Ships `skill-check-refs` (CLI + `./dedup` library export): exact-duplicate + same-name-divergence detection, plugin-scoped by default, opt-in near-duplicate detection, `--ignore` escape hatch. Verified end-to-end against the real CRO plugin — reproduces exactly the 3 duplicates / 2 divergences identified at the start of this investigation.
- **PR 4 — taxonomy:** KIND detection + optional `metadata.kind` declaration; type-specific advisory rules.

## Sources (primary unless noted)
- Anthropic — Skill authoring best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices ; https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices
- Claude Code — Skills reference: https://code.claude.com/docs/en/skills
- Agent Skills open standard: https://agentskills.io/specification
- Anthropic skills repo / `skill-creator`: https://github.com/anthropics/skills ; https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- Anthropic engineering — Equipping agents with Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Academic: "Agent Skills for LLMs: Architecture, Acquisition, Security" (arXiv 2602.12430); Voyager (skill library, procedural memory). Community: wshobson/agents; serghei.pl agent-skills-101.

_Caveats: line/token/char budgets are soft, configurable defaults — keep them options, not hard limits. The `scripts/references/assets` layout is a convention, not a hard requirement (top-level reference files are valid) — don't hard-require a `references/` dir. The 5-KIND taxonomy, per-type rules, and cross-skill dedup are design synthesis: no source prescribes them (and none documents any cross-skill sharing convention — that silence is the opportunity)._
