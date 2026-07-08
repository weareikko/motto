# skill/no-unknown-frontmatter-keys

Flag unknown top-level frontmatter keys on a skill.

The Agent Skills standard defines a fixed set of frontmatter fields. An unexpected key is almost always a typo (`descriptoin:`) or a misplaced field — and because the runtime silently ignores unknown keys, the mistake never takes effect and is easy to miss. This rule surfaces it.

Recognized keys: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`, `when_to_use`, `disable-model-invocation`, plus the Claude Code extensions `argument-hint`, `model`, `context`.

## Fails

```yaml
---
name: demo
descriptoin: a thing   # typo — silently ignored by the runtime
---
```

## Passes

```yaml
---
name: demo
description: Does a thing. Use when needed.
allowed-tools: [Bash]
disable-model-invocation: true
---
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allow` | string[] | `[]` | Additional frontmatter keys to permit (e.g. a house-style field). |

```js
"skill/no-unknown-frontmatter-keys": ["error", { allow: ["audience"] }]
```
