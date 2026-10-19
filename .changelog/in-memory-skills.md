### Added

- Lint skills held in memory: when `settings.skill.files` is set, the rules that read other files of a skill (`no-broken-relative-links`, `no-orphan-references`, `reference-has-content`, `multi-domain-has-variants`) read it instead of the disk.
- Add `analyzeSkills` to `@weareikko/eslint-plugin-skill/dedup`: it runs the cross-skill reference analysis on skills passed in memory.
