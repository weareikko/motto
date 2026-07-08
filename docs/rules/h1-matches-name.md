# skill/h1-matches-name

Require the body H1 to correspond to the skill `name`.

> **Opt-in.** This rule is not part of the `recommended` or `strict` presets. The standard skill format does not require an H1, and the frontmatter `name` is a display label rather than the body title, so this convention is left to teams that deliberately adopt it.

The title a reader sees should match the skill's identity. The comparison is normalized — lowercased, with runs of non-alphanumeric characters treated as spaces — so both `# my-skill` and `# My Skill` satisfy `name: my-skill`. Enable it explicitly:

```js
"skill/h1-matches-name": "warn"
```

## Fails

```yaml
name: my-skill
```
```md
# Totally Different Title
```

## Passes

```yaml
name: my-skill
```
```md
# my-skill
```
```md
# My Skill
```

## Options

None.
