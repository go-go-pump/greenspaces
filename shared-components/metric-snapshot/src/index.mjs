// index.mjs — metric-snapshot main entry point

import { parseExposition, parseLine, groupByName } from './parser.mjs';
import { pollMetrics } from './poller.mjs';
import { SnapshotStore } from './snapshot.mjs';
import { evaluate, loadRules } from './evaluator.mjs';
import { generateDashboard } from './dashboard.mjs';
import { Alerter } from './alerter.mjs';
import { writeFileSync } from 'node:fs';

export class MetricSnapshot {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'http://localhost:9090';
    this.snapshotStore = new SnapshotStore(options.snapshotDir || './snapshots');
    this.alerter = new Alerter({
      alertDir: options.alertDir || './alerts',
      webhookUrl: options.webhookUrl || null,
    });
    this.rules = options.rules || [];
    this.dashboardPath = options.dashboardPath || './snapshots/dashboard.html';
  }

  // Take a single snapshot: poll, save, evaluate, dashboard
  async snap() {
    // 1. Poll
    const pollResult = await pollMetrics(this.endpoint);

    // 2. Save snapshot
    const snapshotPath = this.snapshotStore.save(pollResult);

    // 3. Evaluate thresholds
    const alerts = evaluate(pollResult.metrics, this.rules);

    // 4. Fire alerts if any
    if (alerts.length > 0) {
      await this.alerter.fire(alerts);
    }

    // 5. Generate dashboard
    const html = generateDashboard(pollResult, alerts);
    writeFileSync(this.dashboardPath, html);

    return {
      snapshotPath,
      dashboardPath: this.dashboardPath,
      metricCount: pollResult.metrics.length,
      alertCount: alerts.length,
      alerts,
      timestamp: pollResult.timestamp,
    };
  }

  // Load rules from JSON file or array
  setRules(rules) {
    this.rules = loadRules(rules);
  }

  // Get the latest snapshot content
  getLatest() {
    return this.snapshotStore.loadLatest();
  }

  // List all snapshots
  listSnapshots() {
    return this.snapshotStore.list();
  }
}

export function createSnapshot(options = {}) {
  return new MetricSnapshot(options);
}

export { parseExposition, parseLine, groupByName, pollMetrics, SnapshotStore, evaluate, loadRules, generateDashboard, Alerter };
