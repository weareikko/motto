# skill/reference-has-content

Expect a `reference`-kind skill to carry at least one reference file.

> **Opt-in.** Not part of any preset — see [Skill kinds](../design/skill-taxonomy-and-rules.md) for the taxonomy this rule is part of.

This rule only fires when the skill declares itself explicitly:

```yaml
metadata:
  kind: reference
```

A reference (domain-knowledge) skill exists to supply background material on demand. A declared reference skill with an empty or missing `references/` directory has nothing to supply.

## Fails

A skill with `metadata.kind: reference` and no `.md` files under `references/`.

## Passes

A skill with `metadata.kind: reference` and at least one file under `references/`.

## Options

None.
