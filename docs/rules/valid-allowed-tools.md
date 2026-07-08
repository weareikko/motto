# skill/valid-allowed-tools

Validate the shape of the optional `allowed-tools` frontmatter field (a Claude Code extension to the Agent Skills standard).

When present, `allowed-tools` must be a non-empty array of non-empty strings. An empty array grants the skill no tools at all — almost certainly not the intent, and easy to fix by just omitting the field. A non-array value is silently ignored by the runtime.

## Fails

```yaml
allowed-tools: Bash        # not an array
allowed-tools: []          # empty — grants nothing
allowed-tools: [Bash, ""]  # empty entry
```

## Passes

```yaml
allowed-tools: [Bash, Read]
```

```yaml
# field omitted entirely — unrestricted
```

## Options

None.
