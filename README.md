# motto

Tooling for authoring high-quality [Claude Code Agent Skills](https://code.claude.com/docs/en/skills) (`SKILL.md`), split into two layers:

| Package | What it does | When you run it |
| --- | --- | --- |
| [`@weareikko/motto`](packages/motto) | **Skill evals** — validate a skill against its own `description` contract: does it trigger when it claims to, do what it claims, at what token cost. Across harnesses (Claude Code / Pi / OpenCode / Codex) and models. | Pre-publish / CI (costs real agent calls) |
| [`@weareikko/eslint-plugin-skill`](packages/eslint-plugin-skill) | **Hygiene linter** — structural correctness (name/dir match, frontmatter, dead/duplicated references) + statically-measured cost nudges. | Every commit (fast, free) |

## Why two layers

A linter is the `tsc`/`eslint` of skills; evals are the test suite. Our [research log](docs/research/) (9 investigations, ~660 verified trials) established the boundary the hard way: **format/structure choices are null on skill correctness — a static linter can only validate hygiene, never whether a skill actually works or is efficient.** Those behavioral questions need evals. So the linter stays lean and free; the eval tool answers the questions that matter for quality.

## Layout

```
motto/                              (npm-workspaces monorepo)
  packages/
    motto/                          @weareikko/motto            — skill-eval tool (flagship)
    eslint-plugin-skill/            @weareikko/eslint-plugin-skill — hygiene linter
  docs/
    research/                       the evidence log behind every rule + the eval design
    design/                         skill taxonomy & rule design
```

## Develop

```sh
npm install          # workspaces
npm run typecheck    # all packages
npm test             # all packages (unit specs; evals are opt-in, excluded here)
npm run build        # all packages
```

Node ≥ 20, ESM, TypeScript, Vite (library builds), Vitest. See each package's README for specifics; skill evals need credentials — copy [`.env.example`](.env.example) to `.env`.
