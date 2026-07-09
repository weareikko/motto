# skill/no-multiple-h1

Disallow more than one top-level `#` H1 in the skill body.

The standard skill format does **not** require an H1 — the official examples use `##`-first bodies — so this rule does not demand a title. What it catches is *two or more* `#` H1s in one body, which usually means separate documents were merged or headings were over-leveled. Each H1 after the first is reported.

## Fails

```md
# one

# two
```

## Passes

```md
# my-skill

## a section
```

```md
## Overview

No H1 at all is fine.
```

## Options

None.
