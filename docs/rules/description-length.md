# motto/description-length

Cap the length of the skill `description`.

The description is loaded into context for every routing decision. A bloated description wastes tokens and buries the signal that tells an agent when to use the skill. The default ceiling of 1024 characters mirrors the documented frontmatter budget.

## Fails

```yaml
description: <a description longer than the configured maximum…>
```

## Passes

```yaml
description: Formats code. Use when the user asks to format a file.
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `max` | integer ≥ 1 | `1024` | Maximum allowed character count. |

```js
"motto/description-length": ["error", { max: 800 }]
```
