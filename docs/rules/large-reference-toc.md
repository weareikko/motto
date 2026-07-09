# skill/large-reference-toc

Require large reference files to include a table of contents.

Official guidance: reference files over ~300 lines should carry a table of contents so Claude can jump to the relevant section instead of reading (or partially reading) the whole file.

A file satisfies the rule if it has a `Contents` / `Table of Contents` heading **or** a cluster of in-page anchor links (≥ 3 links to `#...`).

## Fails

A `references/*.md` file longer than `maxLines` with no ToC heading and fewer than 3 anchor links.

## Passes

- A reference file at or under `maxLines`.
- A large file with a `## Contents` heading or an anchor-link ToC.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxLines` | integer ≥ 1 | `300` | Line count above which a ToC is required. |

```js
"skill/large-reference-toc": ["warn", { maxLines: 250 }]
```
