// index.mjs — metric-beacon main entry point
import { Counter, Gauge, Histogram, DEFAULT_BUCKETS } from './registry.mjs';
import { MetricStorage } from './storage.mjs';
import { createMiddleware } from './middleware.mjs';
import { createServer, startServer } from './server.mjs';

export class MetricBeacon {
  constructor(options = {}) {
    const dataDir = options.dataDir || './data/metrics';
    this.storage = options.persist !== false ? new MetricStorage(dataDir) : null;
    this.metrics = new Map();
  }

  counter(name, help = '', labelNames = []) {
    if (this.metrics.has(name)) return this.metrics.get(name);
    const metric = new Counter(name, help, labelNames, this.storage);
    this.metrics.set(name, metric);
    if (this.storage) this.storage.registerMetric(name, 'counter', help, labelNames);
    return metric;
  }

  gauge(name, help = '', labelNames = []) {
    if (this.metrics.has(name)) return this.metrics.get(name);
    const metric = new Gauge(name, help, labelNames, this.storage);
    this.metrics.set(name, metric);
    if (this.storage) this.storage.registerMetric(name, 'gauge', help, labelNames);
    return metric;
  }

  histogram(name, help = '', labelNames = [], buckets = DEFAULT_BUCKETS) {
    if (this.metrics.has(name)) return this.metrics.get(name);
    const metric = new Histogram(name, help, labelNames, this.storage, buckets);
    this.metrics.set(name, metric);
    if (this.storage) this.storage.registerMetric(name, 'histogram', help, labelNames, buckets);
    return metric;
  }

  // Return all metrics in Prometheus text exposition format
  expose() {
    const sections = [];
    for (const metric of this.metrics.values()) {
      sections.push(metric.collect());
    }
    return sections.join('\n\n') + '\n';
  }

  // Ingest a single Prometheus-format metric line from external source
  ingest(line) {
    const parsed = parseLine(line);
    if (!parsed) throw new Error(`Malformed metric line: ${line}`);

    const { name, labels, value } = parsed;

    // Auto-create gauge for ingested metrics (external systems push current values)
    if (!this.metrics.has(name)) {
      this.gauge(name, 'Ingested metric', Object.keys(labels));
    }

    const metric = this.metrics.get(name);
    if (metric instanceof Gauge) {
      metric.set(value, labels);
    } else if (metric instanceof Counter) {
      // For counters, interpret the value as the new total
      const current = metric.get(labels);
      if (value > current) metric.inc(labels, value - current);
    }
  }

  metricCount() {
    return this.metrics.size;
  }

  // Express middleware that auto-tracks request metrics
  middleware() {
    return createMiddleware(this);
  }

  // Express handler for /metrics endpoint
  handler() {
    return (req, res) => {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(this.expose());
    };
  }

  // Start standalone HTTP server
  async serve(port = 9090) {
    return startServer(this, port);
  }

  close() {
    if (this.storage) this.storage.close();
  }
}

// Parse a Prometheus metric line: metric_name{label="val"} value [timestamp]
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([\d.eE+-]+)(\s+\d+)?$/);
  if (!match) return null;

  const name = match[1];
  const labelStr = match[3] || '';
  const value = parseFloat(match[4]);
  const timestamp = match[5] ? parseInt(match[5].trim()) : undefined;

  const labels = {};
  if (labelStr) {
    const labelPairs = labelStr.match(/([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g) || [];
    for (const pair of labelPairs) {
      const eqIdx = pair.indexOf('=');
      const key = pair.slice(0, eqIdx);
      const val = pair.slice(eqIdx + 2, -1); // strip ="..."
      labels[key] = val;
    }
  }

  return { name, labels, value, timestamp };
}

export function createBeacon(options = {}) {
  return new MetricBeacon(options);
}

export { Counter, Gauge, Histogram, DEFAULT_BUCKETS, MetricStorage, parseLine };
