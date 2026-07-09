---
name: release-orchestrator
description: Routes a release-related request to the specialized skill that handles it. Use at the start of any release, rollback, changelog, or incident task.
metadata:
  kind: meta
---

# release-orchestrator

Route the request to exactly one specialized skill and output only that skill's name.

For cutting a new production release (tagging, building, promoting a version), the deploy-release skill handles it. For reverting a bad release back to a previous version, the rollback-release skill handles it. For generating or updating the changelog or release notes from commits, the changelog-writer skill handles it. For responding to a live production incident such as paging, mitigation, or status updates, the incident-responder skill handles it. For scheduling or announcing an upcoming maintenance window, the maintenance-notice skill handles it.
