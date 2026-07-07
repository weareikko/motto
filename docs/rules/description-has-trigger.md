# motto/description-has-trigger

Require the `description` to express *when* the skill applies, not just what it is.

An agent routes to a skill purely from its description. A description that only states what the skill does, with no cue about when to reach for it, routes poorly. This rule checks for a trigger phrase such as "use when", "when the user", or "trigger". It is a `warn` by default because the phrasing is heuristic.

## Fails

```yaml
description: A tool that formats code nicely.
```

## Passes

```yaml
description: Formats code. Use when the user asks to format a file.
description: Runs the deploy. Trigger on deploy requests.
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `patterns` | string[] | `["use when", "use this when", "use for", "used when", "used for", "when the user", "when you", "when asked", "trigger", "invoke", "for when"]` | Case-insensitive substrings; the description must contain at least one. |

```js
"motto/description-has-trigger": ["warn", { patterns: ["use when", "trigger"] }]
```
