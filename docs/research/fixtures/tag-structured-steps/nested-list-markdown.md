# deploy-app

1. Confirm the target environment with the user (staging or production).
2. Run the pre-flight checks:
   1. Verify the branch is up to date with main.
   2. Confirm CI is green.
   3. Check no migrations are pending.
3. Build the release artifact.
4. Upload the artifact to the environment.
5. Run the smoke tests and report the result.
