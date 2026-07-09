# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0

Initial release.

- ESLint plugin (built on `@eslint/markdown`, portable to oxlint) that lints
  standard Claude Code Agent Skills (`SKILL.md`).
- Rules: `require-frontmatter`, `name-kebab-case`, `name-matches-dir`,
  `description-length`, `description-no-html`, `no-multiple-h1`,
  `no-broken-relative-links`, `description-has-trigger`, `body-max-length`
  (all in the `recommended` preset), plus the opt-in `h1-matches-name`.
- `recommended` and `strict` flat-config presets.
