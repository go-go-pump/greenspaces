import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseExposition, parseLine, groupByName } from '../src/parser.mjs';
import { evaluate } from '../src/evaluator.mjs';
import { SnapshotStore } from '../src/snapshot.mjs';
import { generateDashboard } from '../src/dashboard.mjs';
import { Alerter } from '../src/alerter.mjs';
import { createSnapshot, pollMetrics } from '../src/index.mjs';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'metric-snapshot-test-'));
}

const SAMPLE_EXPOSITION = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 150
http_requests_total{method="POST",status="201"} 30
http_requests_total{method="GET",status="500"} 5

# HELP active_connections Active connections
# TYPE active_connections gauge
active_connections 42

# HELP response_time_seconds Response time
# TYPE response_time_seconds histogram
response_time_seconds_bucket{le="0.1"} 80
response_time_seconds_bucket{le="0.5"} 130
response_time_seconds_bucket{le="1"} 148
response_time_seconds_bucket{le="+Inf"} 150
response_time_seconds_sum 45.2
response_time_seconds_count 150
`;

describe('metric-snapshot', () => {
  describe('Parser', () => {
    it('parses Prometheus exposition format', () => {
      const metrics = parseExposition(SAMPLE_EXPOSITION);
      assert.ok(metrics.length > 0);
      const requests = metrics.filter(m => m.name === 'http_requests_total');
      assert.equal(requests.length, 3);
    });

    it('parses metric lines with labels', () => {
      const result = parseLine('http_requests_total{method="GET",status="200"} 150');
      assert.equal(result.name, 'http_requests_total');
      assert.deepEqual(result.labels, { method: 'GET', status: '200' });
      assert.equal(result.value, 150);
    });

    it('parses metric lines without labels', () => {
      const result = parseLine('active_connections 42');
      assert.equal(result.name, 'active_connections');
      assert.deepEqual(result.labels, {});
      assert.equal(result.value, 42);
    });

    it('parses help and type annotations', () => {
      const metrics = parseExposition(SAMPLE_EXPOSITION);
      const connMetric = metrics.find(m => m.name === 'active_connections');
      assert.equal(connMetric.help, 'Active connections');
      assert.equal(connMetric.type, 'gauge');
    });

    it('groups metrics by name', () => {
      const metrics = parseExposition(SAMPLE_EXPOSITION);
      const groups = groupByName(metrics);
      assert.ok(groups.has('http_requests_total'));
      assert.equal(groups.get('http_requests_total').series.length, 3);
    });

    it('returns null for invalid lines', () => {
      assert.equal(parseLine(''), null);
      assert.equal(parseLine('# comment'), null);
      assert.equal(parseLine('not a valid line at all!'), null);
    });
  });

  describe('Evaluator', () => {
    const metrics = parseExposition(SAMPLE_EXPOSITION);

    it('fires alert when threshold is crossed', () => {
      const rules = [
        { metric: 'http_requests_total', labels: { status: '500' }, condition: 'gt', threshold: 3, severity: 'critical', message: 'Too many 500s' },
      ];
      const alerts = evaluate(metrics, rules);
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].severity, 'critical');
      assert.equal(alerts[0].value, 5);
    });

    it('does not fire when threshold is not crossed', () => {
      const rules = [
        { metric: 'http_requests_total', labels: { status: '500' }, condition: 'gt', threshold: 100, severity: 'warning' },
      ];
      const alerts = evaluate(metrics, rules);
      assert.equal(alerts.length, 0);
    });

    it('supports multiple conditions', () => {
      const rules = [
        { metric: 'active_connections', condition: 'gte', threshold: 40, severity: 'warning', message: 'High connections' },
        { metric: 'active_connections', condition: 'lt', threshold: 10, severity: 'info', message: 'Low connections' },
      ];
      const alerts = evaluate(metrics, rules);
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].message, 'High connections');
    });

    it('handles missing metric gracefully', () => {
      const rules = [
        { metric: 'nonexistent_metric', condition: 'gt', threshold: 0, severity: 'warning' },
      ];
      const alerts = evaluate(metrics, rules);
      assert.equal(alerts.length, 0);
    });

    it('matches without label filter (all series)', () => {
      const rules = [
        { metric: 'http_requests_total', condition: 'gte', threshold: 1, severity: 'info' },
      ];
      const alerts = evaluate(metrics, rules);
      assert.equal(alerts.length, 3); // all three series match
    });
  });

  describe('SnapshotStore', () => {
    let dir, store;
    before(() => {
      dir = tempDir();
      store = new SnapshotStore(dir);
    });
    after(() => rmSync(dir, { recursive: true, force: true }));

    it('saves and loads a snapshot', () => {
      const pollResult = {
        endpoint: 'http://localhost:9090/metrics',
        timestamp: '2026-03-01T12:00:00.000Z',
        epochMs: Date.now(),
        raw: SAMPLE_EXPOSITION,
        metrics: parseExposition(SAMPLE_EXPOSITION),
      };
      const filepath = store.save(pollResult);
      assert.ok(existsSync(filepath));

      const latest = store.loadLatest();
      assert.ok(latest.includes('http_requests_total'));
      assert.ok(latest.includes('Metric Snapshot'));
    });

    it('lists snapshots', () => {
      const list = store.list();
      assert.ok(list.length >= 1);
      assert.ok(list[0].startsWith('snapshot-'));
    });
  });

  describe('Dashboard', () => {
    it('generates valid HTML', () => {
      const pollResult = {
        endpoint: 'http://localhost:9090/metrics',
        timestamp: '2026-03-01T12:00:00.000Z',
        metrics: parseExposition(SAMPLE_EXPOSITION),
      };
      const html = generateDashboard(pollResult);
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('Metric Snapshot Dashboard'));
      assert.ok(html.includes('http_requests_total'));
      assert.ok(html.includes('active_connections'));
    });

    it('includes alerts in dashboard', () => {
      const pollResult = {
        endpoint: 'http://localhost:9090/metrics',
        timestamp: '2026-03-01T12:00:00.000Z',
        metrics: parseExposition(SAMPLE_EXPOSITION),
      };
      const alerts = [
        { severity: 'critical', metric: 'errors', message: 'Too many errors', value: 99, threshold: 50 },
      ];
      const html = generateDashboard(pollResult, alerts);
      assert.ok(html.includes('Alerts (1)'));
      assert.ok(html.includes('Too many errors'));
    });
  });

  describe('Alerter', () => {
    let dir, alerter;
    before(() => {
      dir = tempDir();
      alerter = new Alerter({ alertDir: dir });
    });
    after(() => rmSync(dir, { recursive: true, force: true }));

    it('writes alerts to file', async () => {
      const alerts = [
        { severity: 'critical', metric: 'test_metric', message: 'Test alert', value: 99, threshold: 50, labels: {} },
      ];
      await alerter.fire(alerts);
      const logPath = join(dir, 'alert-log.txt');
      assert.ok(existsSync(logPath));
      const content = readFileSync(logPath, 'utf-8');
      assert.ok(content.includes('CRITICAL'));
      assert.ok(content.includes('test_metric'));
    });

    it('does nothing for empty alerts', async () => {
      // Should not throw
      await alerter.fire([]);
    });
  });

  describe('Integration: snap with live beacon', () => {
    // Integration test using an actual HTTP server
    let server, dir;

    before(async () => {
      dir = tempDir();
      const express = (await import('express')).default;
      const app = express();
      app.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(SAMPLE_EXPOSITION);
      });
      server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
    });

    after(() => {
      server.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('polls endpoint and returns parsed metrics', async () => {
      const port = server.address().port;
      const result = await pollMetrics(`http://localhost:${port}`);
      assert.ok(result.metrics.length > 0);
      assert.ok(result.raw.includes('http_requests_total'));
    });

    it('takes a full snapshot with evaluation', async () => {
      const port = server.address().port;
      const snap = createSnapshot({
        endpoint: `http://localhost:${port}`,
        snapshotDir: join(dir, 'snapshots'),
        alertDir: join(dir, 'alerts'),
        dashboardPath: join(dir, 'dashboard.html'),
        rules: [
          { metric: 'http_requests_total', labels: { status: '500' }, condition: 'gt', threshold: 3, severity: 'critical', message: '500 errors high' },
        ],
      });

      const result = await snap.snap();
      assert.ok(result.metricCount > 0);
      assert.equal(result.alertCount, 1);
      assert.ok(existsSync(result.snapshotPath));
      assert.ok(existsSync(result.dashboardPath));
    });
  });
});
