# metric-beacon

Lightweight metric publisher using Prometheus-style text exposition format. Part of the [Greenspaces](../../README.md) shared component ecosystem.

## Quickstart

```bash
cd shared-components/metric-beacon
npm install
```

### Embed in your project

```javascript
import { createBeacon } from 'metric-beacon';

const beacon = createBeacon({ dataDir: './data/metrics' });

// Register metrics
const counter = beacon.counter('requests_total', 'Total requests', ['method']);
const gauge = beacon.gauge('active_connections', 'Active connections');
const histogram = beacon.histogram('duration_seconds', 'Request duration', ['route']);

// Use them
counter.inc({ method: 'GET' });
gauge.set(42);
histogram.observe(0.125, { route: '/api/users' });

// Expose via Express
app.get('/metrics', beacon.handler());
```

### Express middleware (auto-tracks requests)

```javascript
app.use(beacon.middleware());
// Automatically tracks: http_requests_total, http_request_duration_seconds, http_requests_in_flight
```

### Standalone server

```bash
node src/cli.mjs --port 9090
# GET  /metrics  — Prometheus text exposition
# POST /ingest   — Push metric lines from external systems
# GET  /health   — Health check
```

### Push metrics from external systems

```bash
curl -X POST http://localhost:9090/ingest \
  -d 'sales_total{product="widget"} 150
error_count{service="api"} 3'
```

## Metric Types

| Type | Description | Methods |
|------|-------------|---------|
| Counter | Monotonically increasing | `inc(labels, value)` |
| Gauge | Can go up or down | `set(value, labels)`, `inc(labels)`, `dec(labels)` |
| Histogram | Distribution of observations | `observe(value, labels)` |

## Output Format

Standard Prometheus text exposition:

```
# HELP requests_total Total requests
# TYPE requests_total counter
requests_total{method="GET"} 42
requests_total{method="POST"} 7
```

## Storage

- **SQLite** (`data/metrics/metrics.db`): Metric registry (name, type, help, labels)
- **Text files** (`data/metrics/series/`): Time-series log per metric, Prometheus format

## Tests

```bash
npm test
```
