# snapctl create flags

- `--retain <n>`: keep only the n most recent snapshots, deleting older ones.
- `--tag <name>`: attach a human-readable tag to the snapshot.
- `--dry-run`: preview the operation without creating anything.
- `--force`: skip the confirmation prompt.
- `--compress <algo>`: compress the snapshot using the given algorithm (e.g. gzip, zstd). Default: no compression. `--compress` cannot be combined with `--verify` — integrity verification is not supported on compressed snapshots.
- `--exclude <pattern>`: exclude paths matching the glob pattern.
- `--verify`: verify snapshot integrity immediately after creation. Cannot be combined with `--compress` (see above).
- `--output <dir>`: output directory for the snapshot (default: ./snapshots).
- `--parallel <n>`: number of parallel workers for the snapshot operation.
- `--since <date>`: create an incremental snapshot containing only changes since the given date.
