---
name: dbsync-wrapper
description: Wraps the dbsync CLI for copying tables between environments. Use when the user asks to copy, sync, or replicate a table from one environment to another.
metadata:
  kind: tool-wrapper
---

# dbsync-wrapper

`dbsync copy <source-table> <dest-env>` copies a table between environments.

It supports **column masking** (redacting sensitive columns during the copy) and a **preview mode** (compute and show the plan without executing). The exact flag names and syntax for these are non-obvious — always follow the worked examples below rather than guessing conventional flag names, because dbsync does not use `--exclude` or `--dry-run`.

## Examples

Copy a whole table, executing immediately:

```
dbsync copy production.users staging
```

Copy while masking sensitive columns (comma-separated, no spaces):

```
dbsync copy production.users staging --mask email,ssn
```

Preview a copy without executing it (dbsync's preview flag is `--plan`, not `--dry-run`):

```
dbsync copy production.users staging --plan
```

Mask columns and preview together:

```
dbsync copy production.users staging --mask email,ssn --plan
```

Always confirm the exact command with the user before running a non-preview copy against production.
