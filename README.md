# @ikko-dev/eslint-plugin-skill

[![NPM Version](https://img.shields.io/npm/v/@ikko-dev/eslint-plugin-skill.svg?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@ikko-dev/eslint-plugin-skill/)
[![Downloads](https://img.shields.io/npm/dm/@ikko-dev/eslint-plugin-skill?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@ikko-dev/eslint-plugin-skill/)
[![Size](https://img.shields.io/bundlephobia/minzip/@ikko-dev/eslint-plugin-skill?style=flat&colorB=3e63dd&colorA=414853&label=size)](https://bundlephobia.com/package/@ikko-dev/eslint-plugin-skill)
![Codecov](https://img.shields.io/codecov/c/github/ikko-dev/eslint-plugin-skill?style=flat&colorB=3e63dd&colorA=414853)

An ESLint plugin that lints [Claude Code Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) (`SKILL.md` files) for quality.

## Rules

The linter targets the standard Claude Code skill format: `name` + `description` YAML frontmatter and a Markdown body that starts with an H1.

| Rule | What it enforces | `recommended` |
| --- | --- | --- |
| [`require-frontmatter`](docs/rules/require-frontmatter.md) | `name` and `description` present and non-empty | error |
| [`name-kebab-case`](docs/rules/name-kebab-case.md) | `name` is letter-start kebab-case | error |
| [`name-matches-dir`](docs/rules/name-matches-dir.md) | `name` equals the skill's folder name | error |
| [`description-length`](docs/rules/description-length.md) | `description` ≤ 1024 chars (configurable) | error |
| [`description-no-html`](docs/rules/description-no-html.md) | no HTML/XML tags in `description` | error |
| [`no-multiple-h1`](docs/rules/no-multiple-h1.md) | at most one top-level `#` H1 in the body | error |
| [`no-broken-relative-links`](docs/rules/no-broken-relative-links.md) | relative links/images resolve on disk | error |
| [`description-has-trigger`](docs/rules/description-has-trigger.md) | `description` says *when* to use the skill | warn |
| [`body-max-length`](docs/rules/body-max-length.md) | body stays short (progressive disclosure) | warn |

`recommended` fails on structural errors and nudges on quality with warnings. `strict` promotes every rule to `error`.

### Opt-in rules

Not enabled by any preset — the standard skill format does not require an H1, and `name` is a display label rather than the body title. Turn it on if your team adopts the convention:

| Rule | What it enforces |
| --- | --- |
| [`h1-matches-name`](docs/rules/h1-matches-name.md) | the body H1 corresponds to `name` |

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
