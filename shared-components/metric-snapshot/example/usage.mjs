// example/usage.mjs — How to use metric-snapshot
//
// Prerequisites:
//   1. Start metric-beacon: cd ../metric-beacon && node src/cli.mjs
//   2. Push some metrics to it:
//      curl -X POST http://localhost:9090/ingest -d 'sales_total{product="widget"} 150'
//   3. Run this script: node example/usage.mjs

import { createSnapshot } from '../src/index.mjs';

const snap = createSnapshot({
  endpoint: 'http://localhost:9090',
  snapshotDir: './snapshots',
  alertDir: './alerts',
  dashboardPath: './snapshots/dashboard.html',
  rules: [
    {
      metric: 'http_requests_total',
      labels: { status_code: '500' },
      condition: 'gt',
      threshold: 10,
      severity: 'critical',
      message: 'Too many 500 errors — investigate immediately',
    },
    {
      metric: 'active_connections',
      condition: 'gt',
      threshold: 100,
      severity: 'warning',
      message: 'Connection count is high',
    },
    {
      metric: 'http_request_duration_seconds_sum',
      condition: 'gt',
      threshold: 60,
      severity: 'warning',
      message: 'Cumulative response time is high',
    },
  ],
});

try {
  console.log('Taking snapshot...\n');
  const result = await snap.snap();

  console.log(`Snapshot saved:  ${result.snapshotPath}`);
  console.log(`Dashboard:       ${result.dashboardPath}`);
  console.log(`Metrics found:   ${result.metricCount}`);
  console.log(`Alerts fired:    ${result.alertCount}`);

  if (result.alerts.length > 0) {
    console.log('\nAlerts:');
    for (const alert of result.alerts) {
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.metric}: ${alert.message}`);
    }
  }

  console.log('\nOpen the dashboard in your browser:');
  console.log(`  open ${result.dashboardPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  console.error('\nMake sure metric-beacon is running: cd ../metric-beacon && node src/cli.mjs');
}
