# skill/no-orphan-references

Flag `.md` files under `references/` that nothing in `SKILL.md` links to.

Claude loads reference files by following the pointers in `SKILL.md`, so a file in `references/` that isn't linked is never read — dead weight. It's usually a leftover, a rename that broke the link, or a pointer someone forgot to add. This is the inverse of [`no-broken-relative-links`](no-broken-relative-links.md) (which flags links with no file); this flags files with no link.

Only runs when the skill has a `references/` directory on disk and a resolvable path.

## Fails

```
my-skill/
├── SKILL.md            # links references/setup.md only
└── references/
    ├── setup.md        # ok
    └── leftover.md     # flagged — never linked
```

## Passes

Every file under `references/` is linked from `SKILL.md`.

## Options

None.
