---
"@ikko-dev/eslint-plugin-skill": minor
---

Lint skills held in memory: the rules that read other files of a skill (`no-broken-relative-links`, `no-orphan-references`, `reference-has-content`, `multi-domain-has-variants`) read `settings.skill.files` instead of the disk when it is set, and `analyzeSkills` runs the cross-skill reference analysis over skills passed in memory.
