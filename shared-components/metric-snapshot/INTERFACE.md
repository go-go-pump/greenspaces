# metric-snapshot — Interface Contract

> **Status:** AVAILABLE
> **Type:** Shared Component
> **Source Origin:** Greenspaces (new build)

---

## What It Does

Polls a metric-beacon endpoint on demand, saves the result as a local TXT snapshot, evaluates threshold rules to produce alerts, and generates an HTML dashboard for visual inspection. Designed for a "Biz Monitor" persona that polls and reflects — single snapshot, only when necessary.

## Interface

### Input

#### Configuration

```javascript
import { createSnapshot } from 'metric-snapshot';

const snap = createSnapshot({
  endpoint: string,        // metric-beacon URL (default: 'http://localhost:9090')
  snapshotDir: string,     // Snapshot output dir (default: './snapshots')
  alertDir: string,        // Alert output dir (default: './alerts')
  webhookUrl: string,      // Optional webhook for alert delivery
  dashboardPath: string,   // Dashboard HTML path (default: './snapshots/dashboard.html')
  rules: Rule[],           // Threshold evaluation rules
});
```

#### Threshold Rules

```javascript
{
  metric: string,                              // Metric name to match
  labels?: Record<string, string>,             // Optional label filter
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq',
  threshold: number,
  severity: 'critical' | 'warning' | 'info',
  message: string,
}
```

### Output

#### Snap Result

```javascript
const result = await snap.snap();
// {
//   snapshotPath: './snapshots/snapshot-2026-03-01T12-00-00-000Z.txt',
//   dashboardPath: './snapshots/dashboard.html',
//   metricCount: 12,
//   alertCount: 2,
//   alerts: Alert[],
//   timestamp: '2026-03-01T12:00:00.000Z',
// }
```

#### File Outputs

```
{snapshotDir}/
├── snapshot-{timestamp}.txt     # Timestamped snapshot
├── latest.txt                   # Most recent snapshot (overwritten)
└── dashboard.html               # Visual dashboard

{alertDir}/
├── alerts-{timestamp}.txt       # Alert file per evaluation
└── alert-log.txt                # Rolling alert log (append-only)
```

## Dependencies

### System

- Node.js >= 18

### npm

- `express` — Used in integration tests (mock server)

### Requires

- A running `metric-beacon` instance to poll

### API Keys

None required.

## Integration Guide for Consuming Projects

### 1. Reference as Local Dependency

```json
{
  "dependencies": {
    "metric-snapshot": "file:../greenspaces/shared-components/metric-snapshot"
  }
}
```

### 2. Programmatic Usage

```javascript
import { createSnapshot } from 'metric-snapshot';

const snap = createSnapshot({
  endpoint: 'http://localhost:9090',
  rules: [
    { metric: 'orders_total', labels: { status: 'failed' }, condition: 'gt', threshold: 5, severity: 'critical', message: 'Failed orders spike' },
  ],
});

// On-demand snapshot (e.g., from a cron job or monitoring agent)
const result = await snap.snap();
if (result.alertCount > 0) {
  // Handle alerts
}
```

### 3. CLI Usage

```bash
node src/cli.mjs --endpoint http://localhost:9090 --rules ./rules.json
```

### 4. Persistence

metric-snapshot has no database. State is managed via text files:

- **Snapshots**: Prometheus-format text with header metadata
- **Alerts**: Human-readable alert summaries
- **Dashboard**: Self-contained HTML (no external dependencies)

All files are local to the consuming project. No schema coordination required.

### 5. Webhook Integration

When `webhookUrl` is configured, alerts are POSTed as JSON:

```json
{
  "timestamp": "2026-03-01T12:00:00.000Z",
  "alertCount": 2,
  "alerts": [
    {
      "severity": "critical",
      "metric": "http_requests_total",
      "labels": { "status_code": "500" },
      "value": 15,
      "threshold": 10,
      "message": "Too many 500 errors"
    }
  ]
}
```

---

## Consuming Projects

| Project | How It Uses metric-snapshot |
|---------|---------------------------|
| Monitoring Dashboard | Primary consumer — polls beacon, evaluates thresholds, serves dashboard |
| All projects | Optional — any project can add on-demand monitoring |
