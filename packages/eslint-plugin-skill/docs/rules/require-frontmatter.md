# skill/require-frontmatter

Require every `SKILL.md` to begin with YAML frontmatter that defines a non-empty `name` and `description`.

These two fields are the contract of a skill: `name` identifies it and `description` is the only text an agent reads when deciding whether to load it. A skill missing either can't be routed to reliably.

## Fails

```md
# just a heading, no frontmatter
```

```md
---
name: my-skill
---

# my-skill
```

## Passes

```md
---
name: my-skill
description: Formats code. Use when the user asks to format a file.
---

# my-skill
```

## Options

None.
