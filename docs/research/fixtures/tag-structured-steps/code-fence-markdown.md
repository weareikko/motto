# rollback-release

1. Identify the last known-good release tag using `git tag --sort=-creatordate | head -5`.
2. Run the rollback script:
   ```
   1) stop service
   2) checkout tag
   3) restart service
   ```
   Confirm each numbered stage above completes without error before continuing.
3. Verify the health check endpoint returns 200.
4. Notify the on-call channel with the rollback tag and timestamp.
