# skill/procedural-has-steps

Expect a `procedural`-kind skill's body to contain ordered steps.

> **Opt-in.** Not part of any preset — see [Skill kinds](../design/skill-taxonomy-and-rules.md) for the taxonomy this rule is part of.

This rule only fires when the skill declares itself explicitly:

```yaml
metadata:
  kind: procedural
```

A procedural (task/workflow) skill exists to walk the agent through a sequence of actions. A declared procedural skill whose body has no ordered (numbered) list at all is either mis-declared or missing its steps — a bullet list doesn't count, since order matters for a procedure.

## Fails

```yaml
metadata:
  kind: procedural
```
```md
# demo

Just prose, no steps.
```

## Passes

```yaml
metadata:
  kind: procedural
```
```md
# demo

1. Do the first thing.
2. Do the second thing.
```

## Options

None.
