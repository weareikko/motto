### Added

- Add `@weareikko/eslint-plugin-skill`, an ESLint plugin that lints Claude Code Agent Skills (`SKILL.md` and `references/**/*.md`). It is built on `@eslint/markdown` and is portable to oxlint.
- Add the `recommended` and `strict` flat-config presets with the rules `require-frontmatter`, `name-kebab-case`, `name-matches-dir`, `description-length`, `description-has-trigger`, `description-no-html`, `no-multiple-h1`, `body-max-length`, `no-broken-relative-links`, `no-unknown-frontmatter-keys`, `refs-one-level-deep`, `no-orphan-references`, `descriptive-reference-filenames`, `large-reference-toc` and `valid-allowed-tools`.
- Add the opt-in rule `h1-matches-name`.
- Add the opt-in rules for a skill that declares its `metadata.kind`: `procedural-has-steps`, `reference-has-content`, `multi-domain-has-variants` and `meta-prefers-dispatch-table`.
- Add the `skill-check-refs` command and the `@weareikko/eslint-plugin-skill/dedup` export. They find reference files that are duplicated or that diverge across skills.
