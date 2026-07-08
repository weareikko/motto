# skill/name-kebab-case

Require the skill `name` to be letter-start kebab-case, matching `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`.

Skill names double as directory names and identifiers. Keeping them lowercase-hyphenated makes them portable across filesystems and predictable to reference.

## Fails

```yaml
name: Bad_Name       # underscores, uppercase
name: 1-leading      # starts with a digit
name: trailing-      # trailing hyphen
```

## Passes

```yaml
name: my-skill
name: skill2-v2
name: a
```

## Options

None.
