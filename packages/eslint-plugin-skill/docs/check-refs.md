# `skill-check-refs` — cross-skill reference de-duplication

`SKILL.md` rules run one file at a time, so they cannot see that two *different* skills carry duplicated or drifted copies of the same reference content. This is a repo/collection-level analysis, shipped as a separate CLI (and library export) rather than an ESLint rule.

## Why

Reference files are meant to live one level below their own `SKILL.md` (see [`refs-one-level-deep`](rules/refs-one-level-deep.md)) and each skill bundle is self-contained — which means sibling skills that need the same background material end up **copying** it. Over time those copies:

- stay byte-identical → a **maintenance burden** (every fix has to be applied N times), or
- drift apart → a **silent correctness hazard** (a fix lands in one copy; the other quietly keeps behaving on stale guidance).

## Usage

```sh
npx @ikko-dev/eslint-plugin-skill skill-check-refs [root] [options]
```

(Or, once installed as a dependency, just `skill-check-refs`.)

```
skill-check-refs [root]                  # default: current directory
  --scope=plugin|repo                    # default: plugin
  --near-duplicates                      # also detect similar content under different filenames
  --threshold=0.75                       # near-duplicate similarity threshold (0-1)
  --ignore=a.md,b.md                     # reference filenames to exclude (deliberate divergence)
  --json                                 # machine-readable output
```

Exit code is **1** if any divergence is found, **0** otherwise (duplicates and near-duplicates are advisory and never fail the run on their own).

## How it works

1. Discovers every `SKILL.md` under `root`.
2. Groups sibling skills into a **scope** — by default, the parent of the nearest ancestor directory literally named `skills` (so `plugins/cro/skills/{a,b}` are compared together, scoped to `plugins/cro`). Skills with no such ancestor fall back to one scope keyed by `root`. Pass `--scope=repo` to compare every discovered skill in one global scope instead.
3. Within each scope, hashes every `references/**/*.md` file (content is normalized first: CRLF → LF, trailing whitespace stripped, runs of blank lines collapsed) and groups by filename.
4. Classifies each same-filename group:
   - **all hashes match** → `duplicate` (warn) — byte-identical across skills, consider consolidating.
   - **hashes differ** → `divergence` (error) — the copies forked; reconcile or rename.
5. With `--near-duplicates`, also compares files with *different* filenames pairwise (word-shingle Jaccard similarity) and reports pairs above the threshold as `near-duplicate` (warn) — a likely copy that was renamed instead of shared.

## Suppressing deliberate divergence

If two skills are supposed to carry different content under the same reference filename, exclude it:

```sh
skill-check-refs . --ignore=output-template.md
```

## Library usage

```ts
import { analyzeReferences, formatReport } from "@ikko-dev/eslint-plugin-skill/dedup";

const result = analyzeReferences("./plugins/cro");
console.log(formatReport(result));
```

## What this does NOT do (yet)

It only *reports* duplication/drift — it does not propose or apply a shared-location refactor. There is currently no official Agent Skills convention for sharing reference content across skills (see the [design doc](design/skill-taxonomy-and-rules.md)); consolidating a flagged duplicate today means picking your own shared location and updating each skill's links by hand.
