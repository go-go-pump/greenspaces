# metric-snapshot

Polls metric-beacon endpoints on demand, saves snapshots as TXT files, evaluates thresholds, and generates an HTML dashboard. Part of the [Greenspaces](../../README.md) shared component ecosystem.

## Quickstart

```bash
cd shared-components/metric-snapshot
npm install
```

### Take a snapshot

```javascript
import { createSnapshot } from 'metric-snapshot';

const snap = createSnapshot({
  endpoint: 'http://localhost:9090',
  rules: [
    { metric: 'http_requests_total', labels: { status_code: '500' }, condition: 'gt', threshold: 10, severity: 'critical', message: 'Too many errors' },
    { metric: 'active_connections', condition: 'gt', threshold: 100, severity: 'warning', message: 'High connections' },
  ],
});

const result = await snap.snap();
// result.snapshotPath  → ./snapshots/snapshot-2026-03-01T12-00-00-000Z.txt
// result.dashboardPath → ./snapshots/dashboard.html
// result.alertCount    → number of threshold violations
```

### CLI

```bash
# Single snapshot
node src/cli.mjs --endpoint http://localhost:9090

# With threshold rules
node src/cli.mjs --endpoint http://localhost:9090 --rules rules.json

# With webhook alerts
node src/cli.mjs --endpoint http://localhost:9090 --rules rules.json --webhook https://hooks.example.com/alert
```

### Rules file format (rules.json)

```json
[
  {
    "metric": "http_requests_total",
    "labels": { "status_code": "500" },
    "condition": "gt",
    "threshold": 10,
    "severity": "critical",
    "message": "Too many 500 errors"
  },
  {
    "metric": "active_connections",
    "condition": "gt",
    "threshold": 100,
    "severity": "warning",
    "message": "Connection count is high"
  }
]
```

### Conditions

| Condition | Meaning |
|-----------|---------|
| `gt` | Greater than |
| `lt` | Less than |
| `gte` | Greater than or equal |
| `lte` | Less than or equal |
| `eq` | Equal to |
| `neq` | Not equal to |

## Output

- **Snapshots** (`./snapshots/`): TXT files with timestamped metric data + `latest.txt`
- **Dashboard** (`./snapshots/dashboard.html`): Dark-themed HTML page showing all metrics and alerts
- **Alerts** (`./alerts/`): Alert files + rolling `alert-log.txt`

## Designed for the "Biz Monitor" Persona

metric-snapshot is built for on-demand polling — not continuous scraping. A monitoring agent (human or AI) triggers a snapshot when they want to assess system health. The flow:

1. Poll metric-beacon
2. Save state locally
3. Evaluate against rules
4. Surface alerts
5. Generate visual dashboard

## Tests

```bash
npm test
```
