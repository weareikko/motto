# rollback-release

<steps>
<step>Identify the last known-good release tag using `git tag --sort=-creatordate | head -5`.</step>
<step>Run the rollback script:
```
1) stop service
2) checkout tag
3) restart service
```
Confirm each numbered stage above completes without error before continuing.</step>
<step>Verify the health check endpoint returns 200.</step>
<step>Notify the on-call channel with the rollback tag and timestamp.</step>
</steps>
