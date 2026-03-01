#!/usr/bin/env node
// cli.mjs — metric-snapshot CLI

import { createSnapshot } from './index.mjs';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
let endpoint = 'http://localhost:9090';
let snapshotDir = './snapshots';
let alertDir = './alerts';
let rulesFile = null;
let webhookUrl = null;
let dashboardPath = './snapshots/dashboard.html';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--endpoint' && args[i + 1]) endpoint = args[++i];
  if (args[i] === '--snapshot-dir' && args[i + 1]) snapshotDir = args[++i];
  if (args[i] === '--alert-dir' && args[i + 1]) alertDir = args[++i];
  if (args[i] === '--rules' && args[i + 1]) rulesFile = args[++i];
  if (args[i] === '--webhook' && args[i + 1]) webhookUrl = args[++i];
  if (args[i] === '--dashboard' && args[i + 1]) dashboardPath = args[++i];
  if (args[i] === '--help') {
    console.log(`metric-snapshot — Poll metrics, save snapshots, evaluate thresholds

Usage: node src/cli.mjs [options]

Options:
  --endpoint <url>      Metric-beacon endpoint (default: http://localhost:9090)
  --snapshot-dir <dir>  Snapshot output directory (default: ./snapshots)
  --alert-dir <dir>     Alert output directory (default: ./alerts)
  --rules <file>        JSON file with threshold rules
  --webhook <url>       Webhook URL for alert notifications
  --dashboard <path>    Dashboard HTML output path (default: ./snapshots/dashboard.html)
  --help                Show this help
`);
    process.exit(0);
  }
}

const options = { endpoint, snapshotDir, alertDir, webhookUrl, dashboardPath };
const snapshot = createSnapshot(options);

// Load rules if specified
if (rulesFile) {
  if (!existsSync(rulesFile)) {
    console.error(`Rules file not found: ${rulesFile}`);
    process.exit(1);
  }
  const rules = JSON.parse(readFileSync(rulesFile, 'utf-8'));
  snapshot.setRules(rules);
}

console.log(`metric-snapshot — polling ${endpoint}...`);

try {
  const result = await snapshot.snap();
  console.log(`Snapshot saved: ${result.snapshotPath}`);
  console.log(`Dashboard:     ${result.dashboardPath}`);
  console.log(`Metrics:       ${result.metricCount}`);
  console.log(`Alerts:        ${result.alertCount}`);
  if (result.alerts.length > 0) {
    for (const alert of result.alerts) {
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.metric}: ${alert.message}`);
    }
  }
} catch (err) {
  console.error(`Failed to take snapshot: ${err.message}`);
  process.exit(1);
}
