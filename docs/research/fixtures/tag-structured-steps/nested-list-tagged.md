# deploy-app

<steps>
<step>Confirm the target environment with the user (staging or production).</step>
<step>Run the pre-flight checks:
1. Verify the branch is up to date with main.
2. Confirm CI is green.
3. Check no migrations are pending.
</step>
<step>Build the release artifact.</step>
<step>Upload the artifact to the environment.</step>
<step>Run the smoke tests and report the result.</step>
</steps>
