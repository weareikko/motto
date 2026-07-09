# skill/refs-one-level-deep

Require reference links in `SKILL.md` to stay one level deep.

Official guidance: every reference file should link **directly** from `SKILL.md` and live at most one directory below it. Deeply nested reference chains are an anti-pattern — when Claude reaches a file indirectly it may only partially read it (e.g. `head -100`), so it can act on incomplete information.

Only relative links/images are checked; external URLs and `#anchors` are ignored.

## Fails

```md
[deep](references/sub/setup.md)   # more than one directory deep
[up](../shared/setup.md)          # points outside the skill directory
```

## Passes

```md
[ref](references/setup.md)
[sibling](./notes.md)
[external](https://example.com)
```

## Options

None.
