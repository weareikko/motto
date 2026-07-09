# Database Outages

### Symptom: Connection pool exhausted

When `dbctl status` shows pool utilization above 95% and new connections are timing out:

1. Check current pool state: `dbctl pool status --verbose`
2. Drain gracefully: `dbctl pool drain --graceful`
3. Resize the pool: `dbctl pool resize --max 200`
4. Confirm recovery: `dbctl pool status` should show utilization under 70% within 2 minutes.

**Do NOT restart the primary database** to clear pool pressure — a primary restart triggers a 10-minute failover window that affects all read replicas and can cascade into a full outage. Pool drain+resize resolves the vast majority of exhaustion cases without failover risk.

### Symptom: Replication lag

When `dbctl replicas status` shows lag over 30s on any replica:

1. Check replica health: `dbctl replicas status --verbose`
2. Identify the lagging replica's write load: `dbctl replicas load <replica-id>`
3. If load-driven, temporarily remove from the read pool: `dbctl replicas drain <replica-id>`
4. Re-add once lag clears: `dbctl replicas restore <replica-id>`

### Escalation

If pool exhaustion recurs within 1 hour of a resize, page the database on-call via #db-oncall. Do not attempt a second resize without on-call sign-off — repeated resizes without root-cause investigation have caused memory pressure incidents in the past.

### Monitoring

- Dashboard: `grafana.internal/d/db-health`
- Key metric: `db_pool_utilization_pct`
- Alert threshold: 90% for 5 minutes
