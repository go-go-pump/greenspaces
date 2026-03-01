# metric-beacon — Interface Contract

> **Status:** AVAILABLE
> **Type:** Shared Component
> **Source Origin:** Greenspaces (new build)

---

## What It Does

Lightweight metric publisher using Prometheus-style text exposition format. Applications instrument their code with counters, gauges, and histograms, then expose metrics via a standard HTTP endpoint. Supports both embedded mode (in-process) and standalone server mode (accepts pushes from external systems).

## Interface

### Input

#### Programmatic (Embedded)

```javascript
import { createBeacon } from 'metric-beacon';

const beacon = createBeacon({
  dataDir: string,    // Directory for SQLite + series files (default: './data/metrics')
  persist: boolean,   // Enable disk persistence (default: true)
});

// Register metrics
const counter = beacon.counter(name, help, labelNames);
const gauge = beacon.gauge(name, help, labelNames);
const histogram = beacon.histogram(name, help, labelNames, buckets);

// Use metrics
counter.inc(labels?, value?);           // Increment counter
gauge.set(value, labels?);              // Set gauge value
gauge.inc(labels?, value?);             // Increment gauge
gauge.dec(labels?, value?);             // Decrement gauge
histogram.observe(value, labels?);      // Record observation
```

#### HTTP Ingestion (Standalone)

```
POST /ingest
Content-Type: text/plain

metric_name{label="value"} 42
another_metric 3.14
```

### Output

#### HTTP Exposition

```
GET /metrics
Content-Type: text/plain; version=0.0.4

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api",status_code="200"} 150

# HELP active_connections Active connections
# TYPE active_connections gauge
active_connections 42
```

#### Persisted Files

```
{dataDir}/
├── metrics.db              # SQLite: metric registry
└── series/
    ├── http_requests_total.txt    # Time-series log
    ├── active_connections.txt
    └── ...
```

## Dependencies

### System

- Node.js >= 18

### npm

- `better-sqlite3` — Metric metadata persistence
- `express` — HTTP server and middleware

### API Keys

None required.

## Integration Guide for Consuming Projects

### 1. Reference as Local Dependency

```json
{
  "dependencies": {
    "metric-beacon": "file:../greenspaces/shared-components/metric-beacon"
  }
}
```

### 2. Programmatic Usage

```javascript
import { createBeacon } from 'metric-beacon';

const beacon = createBeacon({ dataDir: './data/metrics' });

// Register project-specific metrics
const ordersTotal = beacon.counter('orders_total', 'Total orders', ['status']);
ordersTotal.inc({ status: 'completed' });

// Embed in Express app
app.use(beacon.middleware());       // Auto-track requests
app.get('/metrics', beacon.handler()); // Expose endpoint
```

### 3. Standalone Server

```bash
node src/cli.mjs --port 9090 --data-dir ./data/metrics
```

### 4. Persistence Schema

The metric registry is stored in SQLite (`metrics.db`):

```sql
CREATE TABLE IF NOT EXISTS metrics (
  name TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('counter', 'gauge', 'histogram')),
  help TEXT DEFAULT '',
  label_names TEXT DEFAULT '[]',
  buckets TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

This schema is **owned by metric-beacon**. Consuming projects do not need to create it — it is auto-initialized on first use.

Time-series data is stored as append-only text files in Prometheus format:

```
metric_name{labels} value timestamp
```

### 5. Express Middleware

The middleware auto-registers and tracks three metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | histogram | method, route | Request duration |
| `http_requests_in_flight` | gauge | — | Currently processing |

## Metrics

metric-beacon is itself the metrics foundation. Consuming projects emit metrics through it:

```
# Project-specific examples:
orders_total{status="completed"} 150
api_errors_total{endpoint="/checkout"} 3
queue_depth{queue="emails"} 42
```

---

## Consuming Projects

| Project | How It Uses metric-beacon |
|---------|--------------------------|
| All projects | Default inclusion — every project exposes metrics through beacon |
| metric-snapshot | Polls beacon's /metrics endpoint for snapshots and evaluation |
