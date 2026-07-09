# Network Outages

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
