// storage.mjs — SQLite metadata + text file time-series persistence
import Database from 'better-sqlite3';
import { mkdirSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export class MetricStorage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.seriesDir = join(dataDir, 'series');
    mkdirSync(this.seriesDir, { recursive: true });

    this.db = new Database(join(dataDir, 'metrics.db'));
    this.db.pragma('journal_mode = WAL');
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        name TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('counter', 'gauge', 'histogram')),
        help TEXT DEFAULT '',
        label_names TEXT DEFAULT '[]',
        buckets TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  registerMetric(name, type, help = '', labelNames = [], buckets = []) {
    this.db.prepare(`
      INSERT OR REPLACE INTO metrics (name, type, help, label_names, buckets, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(name, type, help, JSON.stringify(labelNames), JSON.stringify(buckets));
  }

  getMetric(name) {
    const row = this.db.prepare('SELECT * FROM metrics WHERE name = ?').get(name);
    if (!row) return null;
    return {
      ...row,
      label_names: JSON.parse(row.label_names),
      buckets: JSON.parse(row.buckets),
    };
  }

  getAllMetrics() {
    return this.db.prepare('SELECT * FROM metrics').all().map(row => ({
      ...row,
      label_names: JSON.parse(row.label_names),
      buckets: JSON.parse(row.buckets),
    }));
  }

  appendSeries(name, labels, value, timestamp = Date.now()) {
    const file = join(this.seriesDir, `${sanitizeFilename(name)}.txt`);
    const labelStr = formatLabels(labels);
    const line = `${name}${labelStr} ${value} ${timestamp}\n`;
    appendFileSync(file, line);
  }

  readSeries(name) {
    const file = join(this.seriesDir, `${sanitizeFilename(name)}.txt`);
    if (!existsSync(file)) return [];
    return readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
  }

  close() {
    this.db.close();
  }
}

function formatLabels(labels) {
  if (!labels || Object.keys(labels).length === 0) return '';
  const pairs = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `{${pairs}}`;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}
