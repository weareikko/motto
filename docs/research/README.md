# Research log

This directory is the evidence base behind `@ikko-dev/eslint-plugin-skill`'s rules. The project's goal is to make skill authoring choices **measured, not assumed** — every entry here follows the same shape:

1. **Question** — a concrete, falsifiable claim about how to write skills better (for comprehension, cost, or token efficiency).
2. **Evidence** — documented guidance (Anthropic's official docs, the Agent Skills spec) and/or a direct empirical test (blind trials with fresh agent instances, real token counts).
3. **Verdict** — adopt / don't adopt / adopt-with-caveats.
4. **Resulting rule** — the lint rule the verdict justifies, or an explicit note that no rule was warranted.

A **negative result** (evidence says "don't do this") is recorded with the same rigor as a positive one — it's what stops the same idea from being re-litigated later without cause, and stops a plausible-sounding convention from being adopted on vibes.

## Entries

| Question | Verdict | Rule |
| --- | --- | --- |
| [Should procedural steps use `<steps><step>` tags instead of markdown ordered lists?](tag-structured-steps.md) | **Don't adopt** — no comprehension benefit, +23–31% token cost | none (kept `procedural-has-steps` as-is) |
| [Do the documented 500-line body / 300-line ToC thresholds hold up, and how do real skills split reference content?](progressive-disclosure-thresholds.md) | **Confirmed** as advisory; real-world practice (skill-creator) consolidates rather than always splitting | none new (confirms `body-max-length` / `large-reference-toc` as configured) |

Untested, prioritized backlog of falsifiable questions for `reference`, `multi-domain`, `tool-wrapper`, and `meta` kinds: [`backlog.md`](backlog.md).
