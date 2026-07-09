# skill/descriptive-reference-filenames

Require reference files (`.md` under `references/`) to have descriptive names.

Claude decides whether to open a reference file partly from its filename, so a generic name like `doc2.md` or `untitled.md` carries no signal. Official guidance: name files descriptively — `form_validation_rules.md`, not `doc2.md`.

Flags generic stems (`doc`, `ref`, `reference`, `file`, `page`, `untitled`, `temp`, `tmp`, `new`, `copy`, `note(s)`, `document`, optionally numbered) and bare numeric names (`1.md`).

## Fails

```
references/doc2.md
references/untitled.md
references/1.md
```

## Passes

```
references/form_validation_rules.md
references/ga4-setup.md
```

## Options

None.
