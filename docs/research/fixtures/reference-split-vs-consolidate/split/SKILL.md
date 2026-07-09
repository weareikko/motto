---
name: incident-runbooks
description: On-call runbooks for common production incidents (database, network, auth outages). Use when investigating or responding to an active incident.
metadata:
  kind: reference
---

# incident-runbooks

Consult the runbook matching the incident's symptom before taking any destructive action (restarts, failovers, cache flushes):

- [Database outages](references/database-outage.md) — connection pool exhaustion, replication lag.
- [Network outages](references/network-outage.md) — cross-region latency, packet loss.
- [Auth outages](references/auth-outage.md) — SSO login failures, auth latency.
