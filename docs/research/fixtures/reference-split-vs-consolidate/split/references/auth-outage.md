# Auth Outages

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
