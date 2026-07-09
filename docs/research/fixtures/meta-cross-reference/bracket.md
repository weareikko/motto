---
name: release-orchestrator
description: Routes a release-related request to the specialized skill that handles it. Use at the start of any release, rollback, changelog, or incident task.
metadata:
  kind: meta
---

# release-orchestrator

Route the request to exactly one specialized skill and output only that skill's name.

- For cutting a new production release (tagging, building, promoting a version): use [[deploy-release]].
- For reverting a bad release back to a previous version: use [[rollback-release]].
- For generating or updating the changelog / release notes from commits: use [[changelog-writer]].
- For responding to a live production incident (paging, mitigation, status updates): use [[incident-responder]].
- For scheduling or announcing an upcoming maintenance window: use [[maintenance-notice]].
