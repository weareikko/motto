---
name: dbsync-wrapper
description: Wraps the dbsync CLI for copying tables between environments. Use when the user asks to copy, sync, or replicate a table from one environment to another.
metadata:
  kind: tool-wrapper
---

# dbsync-wrapper

`dbsync copy <source-table> <dest-env>` copies a table between environments.

It supports **column masking** (redacting sensitive columns during the copy) and a **preview mode** (compute and show the plan without executing). The exact flag names and syntax for these are non-obvious — always follow the worked examples in [references/examples.md](references/examples.md) rather than guessing conventional flag names, because dbsync does not use `--exclude` or `--dry-run`.

Always confirm the exact command with the user before running a non-preview copy against production.
