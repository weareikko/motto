# skill/name-matches-dir

Require the skill `name` to equal the name of the directory that contains its `SKILL.md`.

Claude Code discovers a skill by its folder. If the frontmatter `name` and the folder disagree, tooling and humans reference two different identities for the same skill.

The rule is a no-op when the file has no resolvable directory (e.g. a bare `SKILL.md` with no parent folder).

## Fails

```
skills/my-skill/SKILL.md
```
```yaml
name: other-name
```

## Passes

```
skills/my-skill/SKILL.md
```
```yaml
name: my-skill
```

## Options

None.
