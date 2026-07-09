# Incident Runbooks

## Database Outages

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

## Network Outages

### Symptom: Elevated cross-region latency

When p99 latency between regions exceeds 500ms:

1. Check BGP session status: `netctl bgp status --all-regions`
2. If a session is flapping, identify the affected peer: `netctl bgp peers --flapping`
3. Fail over the route: `netctl route failover --region <region>`
4. Confirm recovery: `netctl latency check --region <region>` should show p99 under 100ms within 3 minutes.

**Do NOT restart the edge routers** to clear a flapping BGP session — an edge router restart drops all active connections region-wide and takes 4-6 minutes to re-establish full peering. Route failover isolates the bad path without touching active connections on healthy paths.

### Symptom: Partial packet loss

When `netctl loss report` shows loss above 1% on any path:

1. Identify the affected path: `netctl loss report --detail`
2. Check for a known maintenance window: `netctl maintenance status`
3. If no maintenance is active, open a ticket with the upstream provider via `netctl escalate --provider`

### Escalation

If route failover doesn't restore latency within 5 minutes, page network on-call via #net-oncall.

### Monitoring

- Dashboard: `grafana.internal/d/network-health`
- Key metric: `cross_region_p99_latency_ms`
- Alert threshold: 500ms for 3 minutes

## Auth Outages

### Symptom: SSO login failures spiking

When the SSO failure rate exceeds 5% of login attempts:

1. Check IdP certificate status: `authctl cert status --idp <name>`
2. If the certificate is expired or expiring within 24h, rotate it: `authctl cert rotate --idp <name>`
3. Confirm recovery: `authctl cert status` should show a valid, non-expiring certificate, and the failure rate should drop within 2 minutes of rotation.

**Do NOT restart the auth service during business hours** to clear login failures — an auth service restart invalidates all active sessions immediately, forcing every logged-in user to re-authenticate at once. Certificate rotation resolves expiry-driven failures without touching active sessions.

### Symptom: Elevated auth latency

When p99 auth latency exceeds 2s:

1. Check IdP response time: `authctl idp latency --name <name>`
2. If the IdP itself is slow, this is typically an upstream issue — open a ticket via `authctl escalate --idp`
3. If internal, check the token cache hit rate: `authctl cache stats`

### Escalation

If certificate rotation doesn't restore the login success rate within 5 minutes, page identity on-call via #identity-oncall.

### Monitoring

- Dashboard: `grafana.internal/d/auth-health`
- Key metric: `sso_failure_rate_pct`
- Alert threshold: 5% for 2 minutes
