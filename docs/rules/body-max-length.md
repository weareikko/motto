# motto/body-max-length

Keep the skill body short to preserve progressive disclosure.

A `SKILL.md` is an entry point, not a manual. Heavy detail belongs in referenced files that are loaded on demand, so the skill itself stays cheap to keep in context. This rule flags bodies (frontmatter excluded) that grow past a line budget. It is a `warn` by default.

## Fails

A body longer than `maxLines` lines.

## Passes

A concise body that links out to references for detail.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxLines` | integer ≥ 1 | `500` | Maximum body lines, excluding frontmatter. |

```js
"motto/body-max-length": ["warn", { maxLines: 400 }]
```
