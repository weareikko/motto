# skill/name-kebab-case

Require the skill `name` to be a valid Agent Skills identifier:

- **Kebab-case**, matching `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (letter-start, lowercase, no underscores, no leading/trailing/consecutive hyphens).
- **At most 64 characters** (the spec's hard limit).
- **No reserved words** — the name must not contain `anthropic` or `claude`.

Skill names double as directory names and identifiers. Keeping them lowercase-hyphenated makes them portable across filesystems and predictable to reference; the length and reserved-word limits come from the Agent Skills standard.

## Fails

```yaml
name: Bad_Name          # underscores, uppercase
name: 1-leading         # starts with a digit
name: trailing-         # trailing hyphen
name: claude-helper     # contains a reserved word
name: aaaaaa…(>64)      # exceeds 64 characters
```

## Passes

```yaml
name: my-skill
name: skill2-v2
name: a
```

## Options

None.
