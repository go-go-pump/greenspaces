// registry.mjs — Metric types: Counter, Gauge, Histogram

function serializeLabels(labels) {
  if (!labels || Object.keys(labels).length === 0) return '';
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

export class Counter {
  constructor(name, help, labelNames, storage) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.storage = storage;
    this.values = new Map();
  }

  inc(labels = {}, value = 1) {
    if (value < 0) throw new Error('Counter can only increase');
    const key = serializeLabels(labels);
    const current = this.values.get(key) || 0;
    const next = current + value;
    this.values.set(key, next);
    if (this.storage) {
      this.storage.appendSeries(this.name, labels, next);
    }
  }

  get(labels = {}) {
    return this.values.get(serializeLabels(labels)) || 0;
  }

  reset() {
    this.values.clear();
  }

  collect() {
    const lines = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} counter`);
    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    } else {
      for (const [key, value] of this.values) {
        const labelStr = key ? `{${key}}` : '';
        lines.push(`${this.name}${labelStr} ${value}`);
      }
    }
    return lines.join('\n');
  }
}

export class Gauge {
  constructor(name, help, labelNames, storage) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.storage = storage;
    this.values = new Map();
  }

  set(value, labels = {}) {
    const key = serializeLabels(labels);
    this.values.set(key, value);
    if (this.storage) {
      this.storage.appendSeries(this.name, labels, value);
    }
  }

  inc(labels = {}, value = 1) {
    const key = serializeLabels(labels);
    const current = this.values.get(key) || 0;
    const next = current + value;
    this.values.set(key, next);
    if (this.storage) {
      this.storage.appendSeries(this.name, labels, next);
    }
  }

  dec(labels = {}, value = 1) {
    this.inc(labels, -value);
  }

  get(labels = {}) {
    return this.values.get(serializeLabels(labels)) || 0;
  }

  reset() {
    this.values.clear();
  }

  collect() {
    const lines = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} gauge`);
    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    } else {
      for (const [key, value] of this.values) {
        const labelStr = key ? `{${key}}` : '';
        lines.push(`${this.name}${labelStr} ${value}`);
      }
    }
    return lines.join('\n');
  }
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export class Histogram {
  constructor(name, help, labelNames, storage, buckets = DEFAULT_BUCKETS) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.storage = storage;
    this.buckets = [...buckets].sort((a, b) => a - b);
    this.values = new Map();
  }

  _getOrCreate(labels) {
    const key = serializeLabels(labels);
    if (!this.values.has(key)) {
      const bucketCounts = new Map();
      for (const b of this.buckets) {
        bucketCounts.set(b, 0);
      }
      bucketCounts.set('+Inf', 0);
      this.values.set(key, { buckets: bucketCounts, sum: 0, count: 0, labelKey: key });
    }
    return this.values.get(key);
  }

  observe(value, labels = {}) {
    const entry = this._getOrCreate(labels);
    entry.sum += value;
    entry.count += 1;
    for (const bound of this.buckets) {
      if (value <= bound) {
        entry.buckets.set(bound, entry.buckets.get(bound) + 1);
      }
    }
    entry.buckets.set('+Inf', entry.buckets.get('+Inf') + 1);
    if (this.storage) {
      this.storage.appendSeries(this.name, labels, value);
    }
  }

  reset() {
    this.values.clear();
  }

  collect() {
    const lines = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} histogram`);
    if (this.values.size === 0) {
      for (const b of this.buckets) {
        lines.push(`${this.name}_bucket{le="${b}"} 0`);
      }
      lines.push(`${this.name}_bucket{le="+Inf"} 0`);
      lines.push(`${this.name}_sum 0`);
      lines.push(`${this.name}_count 0`);
    } else {
      for (const [key, entry] of this.values) {
        const prefix = key ? `${key},` : '';
        for (const [bound, count] of entry.buckets) {
          lines.push(`${this.name}_bucket{${prefix}le="${bound}"} ${count}`);
        }
        const labelStr = key ? `{${key}}` : '';
        lines.push(`${this.name}_sum${labelStr} ${entry.sum}`);
        lines.push(`${this.name}_count${labelStr} ${entry.count}`);
      }
    }
    return lines.join('\n');
  }
}

export { DEFAULT_BUCKETS };
