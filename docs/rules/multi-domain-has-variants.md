# skill/multi-domain-has-variants

Expect a `multi-domain`-kind skill to carry at least two variant reference files.

> **Opt-in.** Not part of any preset — see [Skill kinds](../design/skill-taxonomy-and-rules.md) for the taxonomy this rule is part of.

This rule only fires when the skill declares itself explicitly:

```yaml
metadata:
  kind: multi-domain
```

The multi-domain pattern (`SKILL.md` holding selection logic over `references/{aws,gcp,azure}.md`) only earns its complexity when there is more than one variant to select between. Fewer than two reference files means there's nothing to select — it's just a `reference` skill.

## Fails

A skill with `metadata.kind: multi-domain` and fewer than 2 files under `references/`.

## Passes

A skill with `metadata.kind: multi-domain` and 2 or more files under `references/` (e.g. `aws.md`, `gcp.md`).

## Options

None.
