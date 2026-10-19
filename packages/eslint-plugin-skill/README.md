# @ikko-dev/eslint-plugin-skill

[![NPM Version](https://img.shields.io/npm/v/@ikko-dev/eslint-plugin-skill.svg?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@ikko-dev/eslint-plugin-skill/)
[![Downloads](https://img.shields.io/npm/dm/@ikko-dev/eslint-plugin-skill?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@ikko-dev/eslint-plugin-skill/)
[![Size](https://img.shields.io/bundlephobia/minzip/@ikko-dev/eslint-plugin-skill?style=flat&colorB=3e63dd&colorA=414853&label=size)](https://bundlephobia.com/package/@ikko-dev/eslint-plugin-skill)
![Codecov](https://img.shields.io/codecov/c/github/ikko-dev/motto?style=flat&colorB=3e63dd&colorA=414853)

An ESLint plugin that lints [Claude Code Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) (`SKILL.md` files) for quality.

## Rules

The linter targets the standard Claude Code skill format: `name` + `description` YAML frontmatter, a concise Markdown body, and bundled reference files under `references/`.

**Skill (`SKILL.md`) rules:**

| Rule | What it enforces | `recommended` |
| --- | --- | --- |
| [`require-frontmatter`](docs/rules/require-frontmatter.md) | `name` and `description` present and non-empty | error |
| [`name-kebab-case`](docs/rules/name-kebab-case.md) | `name` is valid: kebab-case, ≤ 64 chars, no reserved words | error |
| [`name-matches-dir`](docs/rules/name-matches-dir.md) | `name` equals the skill's folder name | error |
| [`description-length`](docs/rules/description-length.md) | `description` ≤ 1024 chars (configurable) | error |
| [`description-no-html`](docs/rules/description-no-html.md) | no HTML/XML tags in `description` | error |
| [`no-unknown-frontmatter-keys`](docs/rules/no-unknown-frontmatter-keys.md) | frontmatter keys are known spec fields (catches typos) | error |
| [`no-multiple-h1`](docs/rules/no-multiple-h1.md) | at most one top-level `#` H1 in the body | error |
| [`no-broken-relative-links`](docs/rules/no-broken-relative-links.md) | relative links/images resolve on disk | error |
| [`refs-one-level-deep`](docs/rules/refs-one-level-deep.md) | reference links stay one directory below `SKILL.md` | error |
| [`valid-allowed-tools`](docs/rules/valid-allowed-tools.md) | `allowed-tools`, if present, is a non-empty array of tool names | error |
| [`description-has-trigger`](docs/rules/description-has-trigger.md) | `description` says *when* to use the skill | warn |
| [`body-max-length`](docs/rules/body-max-length.md) | body stays short (progressive disclosure) | warn |
| [`no-orphan-references`](docs/rules/no-orphan-references.md) | every `references/` file is linked from `SKILL.md` | warn |

**Reference file (`references/**/*.md`) rules:**

| Rule | What it enforces | `recommended` |
| --- | --- | --- |
| [`descriptive-reference-filenames`](docs/rules/descriptive-reference-filenames.md) | reference files avoid generic names (`doc2.md`) | warn |
| [`large-reference-toc`](docs/rules/large-reference-toc.md) | reference files > 300 lines carry a table of contents | warn |

`recommended` fails on structural errors and nudges on quality with warnings. `strict` promotes every rule to `error`. The preset globs both `**/SKILL.md` and `**/references/**/*.md`.

### Opt-in rules

Not enabled by any preset — the standard skill format does not require an H1, and `name` is a display label rather than the body title. Turn it on if your team adopts the convention:

| Rule | What it enforces |
| --- | --- |
| [`h1-matches-name`](docs/rules/h1-matches-name.md) | the body H1 corresponds to `name` |

### Skill kinds (opt-in)

A skill can declare what *kind* it is via `metadata.kind` in frontmatter (`procedural`, `reference`, `multi-domain`, `tool-wrapper`, or `meta` — see [the taxonomy](docs/design/skill-taxonomy-and-rules.md)). These rules only fire on an **explicit** declaration — never on a guess — so enabling them is safe even if most of your skills haven't declared a kind yet:

| Rule | Fires when declared… | What it enforces |
| --- | --- | --- |
| [`procedural-has-steps`](docs/rules/procedural-has-steps.md) | `kind: procedural` | body contains an ordered (numbered) list |
| [`reference-has-content`](docs/rules/reference-has-content.md) | `kind: reference` | `references/` has at least one file |
| [`multi-domain-has-variants`](docs/rules/multi-domain-has-variants.md) | `kind: multi-domain` | `references/` has at least two files |
| [`meta-prefers-dispatch-table`](docs/rules/meta-prefers-dispatch-table.md) | `kind: meta` | suggests a markdown table over prose for the dispatch list ([evidence](docs/research/meta-dispatch-table-vs-prose.md): ~21% cheaper, no accuracy difference) |

```js
{
  files: ["**/SKILL.md"],
  rules: {
    "skill/procedural-has-steps": "warn",
    "skill/reference-has-content": "warn",
    "skill/multi-domain-has-variants": "warn",
  },
}
```

## Install

```sh
npm install --save-dev eslint @ikko-dev/eslint-plugin-skill
```

## Usage

Add a flat config at the root of your skills repo (`eslint.config.js`):

```js
import skill from "@ikko-dev/eslint-plugin-skill";

export default [skill.configs.recommended];
```

The preset already globs `**/SKILL.md`, loads the markdown language with YAML frontmatter, and enables the rules. Then:

```sh
npx eslint "**/SKILL.md"
```

A ready-to-copy config lives in [`configs/eslint.config.example.js`](configs/eslint.config.example.js), and a GitHub Actions workflow that lints skills on every PR is in [`configs/lint-skills.workflow.yml`](configs/lint-skills.workflow.yml) — drop it into your skills repo at `.github/workflows/lint-skills.yml`.

### Configuring rules

Rules with options can be tuned:

```js
import skill from "@ikko-dev/eslint-plugin-skill";

export default [
  skill.configs.recommended,
  {
    files: ["**/SKILL.md"],
    rules: {
      "skill/description-length": ["error", { max: 800 }],
      "skill/body-max-length": ["warn", { maxLines: 400 }],
      "skill/description-has-trigger": [
        "warn",
        { patterns: ["use when", "trigger", "when the user"] },
      ],
    },
  },
];
```

## Cross-skill reference duplication

`SKILL.md` rules see one file at a time — they can't tell that two *different* skills carry the same reference content, copied or drifted. That's a separate, repo-level check:

```sh
npx skill-check-refs .
```

It groups sibling skills (by default, those sharing a plugin's `skills/` directory), hashes their `references/**/*.md` files, and reports **duplicates** (byte-identical across skills — a maintenance burden) and **divergences** (same filename, different content — a silent correctness hazard, and the only case that fails CI by default). See [`docs/check-refs.md`](docs/check-refs.md) for options (`--near-duplicates`, `--scope`, `--ignore`) and an example CI workflow at [`configs/check-refs.workflow.yml`](configs/check-refs.workflow.yml).

## Skills held in memory

A host that keeps its skills off disk (a database, a remote store) lints them with ESLint's `Linter` and passes every file of the skills in the shared setting `settings.skill.files`, a map from path to content. The rules that look past the linted file (`no-broken-relative-links`, `no-orphan-references`, the `kind` rules) then read that map instead of the disk. A flat config matches only files under the linter's `cwd`, so the virtual root is the `cwd`:

```js
import { Linter } from "eslint";
import skill from "@ikko-dev/eslint-plugin-skill";

const files = {
	"/skills/demo/SKILL.md": skillMd,
	"/skills/demo/references/query.md": queryMd,
};

const messages = new Linter({ cwd: "/skills" }).verify(
	files["/skills/demo/SKILL.md"],
	[skill.configs.recommended, { settings: { skill: { files } } }],
	{ filename: "/skills/demo/SKILL.md" },
);
```

The cross-skill analysis has the same in-memory entry point, `analyzeSkills` from `@ikko-dev/eslint-plugin-skill/dedup`:

```js
import { analyzeSkills } from "@ikko-dev/eslint-plugin-skill/dedup";

const { duplicates, divergences } = analyzeSkills([
	{ name: "skill-a", references: [{ relPath: "tone.md", content: toneA }] },
	{ name: "skill-b", references: [{ relPath: "tone.md", content: toneB }] },
]);
```

Run the plugin with ESLint. oxlint runs ESLint-compatible JS plugins only on the JavaScript and TypeScript files it parses; it does not lint Markdown, so it does not see `SKILL.md`.
