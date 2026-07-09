# dbsync copy — worked examples

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
