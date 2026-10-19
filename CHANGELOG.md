# Changelog

All notable changes to this project will be documented in this file. Each pull request adds a fragment in `.changelog/`; the Publish workflow folds them in here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.1 - 2026-10-19

### Changed

- Publish `@weareikko/eslint-plugin-skill` with an npm provenance attestation, now that the repository is public ([#32])

### Fixed

- Write the `skill-check-refs` bin path without a leading `./`, so `npm publish` no longer warns that it rewrote it ([#32])

[#32]: https://github.com/weareikko/motto/pull/32

## 0.1.0 - 2026-10-19

### Added

- Add `@weareikko/eslint-plugin-skill`, an ESLint plugin that lints Claude Code Agent Skills (`SKILL.md` and `references/**/*.md`). It is built on `@eslint/markdown` and is portable to oxlint. ([#31])
- Add the `recommended` and `strict` flat-config presets with the rules `require-frontmatter`, `name-kebab-case`, `name-matches-dir`, `description-length`, `description-has-trigger`, `description-no-html`, `no-multiple-h1`, `body-max-length`, `no-broken-relative-links`, `no-unknown-frontmatter-keys`, `refs-one-level-deep`, `no-orphan-references`, `descriptive-reference-filenames`, `large-reference-toc` and `valid-allowed-tools`. ([#31])
- Add the opt-in rule `h1-matches-name`. ([#31])
- Add the opt-in rules for a skill that declares its `metadata.kind`: `procedural-has-steps`, `reference-has-content`, `multi-domain-has-variants` and `meta-prefers-dispatch-table`. ([#31])
- Add the `skill-check-refs` command and the `@weareikko/eslint-plugin-skill/dedup` export. They find reference files that are duplicated or that diverge across skills. ([#31])
- Lint skills held in memory: when `settings.skill.files` is set, the rules that read other files of a skill (`no-broken-relative-links`, `no-orphan-references`, `reference-has-content`, `multi-domain-has-variants`) read it instead of the disk. ([#31])
- Add `analyzeSkills` to `@weareikko/eslint-plugin-skill/dedup`: it runs the cross-skill reference analysis on skills passed in memory. ([#31])

### Changed

- **Breaking**: Move the package to the `@weareikko` npm scope. Install `@weareikko/eslint-plugin-skill` and import from `@weareikko/eslint-plugin-skill` and `@weareikko/eslint-plugin-skill/dedup`. The old `@ikko-dev/eslint-plugin-skill` (0.0.1) will be deprecated. ([#31])

[#31]: https://github.com/weareikko/motto/pull/31
