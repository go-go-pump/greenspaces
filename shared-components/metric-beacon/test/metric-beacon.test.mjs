import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createBeacon, parseLine, Counter, Gauge, Histogram } from '../src/index.mjs';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'metric-beacon-test-'));
}

describe('metric-beacon', () => {
  describe('Counter', () => {
    let beacon, dir;
    before(() => {
      dir = tempDir();
      beacon = createBeacon({ dataDir: dir });
    });
    after(() => {
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('increments by 1 by default', () => {
      const c = beacon.counter('test_counter', 'A test counter');
      c.inc();
      c.inc();
      c.inc();
      assert.equal(c.get(), 3);
    });

    it('increments by custom value', () => {
      const c = beacon.counter('test_counter_custom', 'Custom increment');
      c.inc({}, 5);
      assert.equal(c.get(), 5);
      c.inc({}, 3);
      assert.equal(c.get(), 8);
    });

    it('tracks separate label combinations', () => {
      const c = beacon.counter('test_counter_labels', 'With labels', ['method']);
      c.inc({ method: 'GET' });
      c.inc({ method: 'GET' });
      c.inc({ method: 'POST' });
      assert.equal(c.get({ method: 'GET' }), 2);
      assert.equal(c.get({ method: 'POST' }), 1);
    });

    it('rejects negative increments', () => {
      const c = beacon.counter('test_counter_neg', 'No negatives');
      assert.throws(() => c.inc({}, -1), /can only increase/);
    });

    it('produces Prometheus exposition format', () => {
      const c = beacon.counter('expo_counter', 'Exposition test');
      c.inc();
      const output = c.collect();
      assert.ok(output.includes('# HELP expo_counter Exposition test'));
      assert.ok(output.includes('# TYPE expo_counter counter'));
      assert.ok(output.includes('expo_counter 1'));
    });
  });

  describe('Gauge', () => {
    let beacon, dir;
    before(() => {
      dir = tempDir();
      beacon = createBeacon({ dataDir: dir });
    });
    after(() => {
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('sets a value', () => {
      const g = beacon.gauge('test_gauge', 'A test gauge');
      g.set(42);
      assert.equal(g.get(), 42);
    });

    it('increments and decrements', () => {
      const g = beacon.gauge('test_gauge_incdec', 'Inc/dec');
      g.set(10);
      g.inc();
      assert.equal(g.get(), 11);
      g.dec({}, 3);
      assert.equal(g.get(), 8);
    });

    it('tracks separate label combinations', () => {
      const g = beacon.gauge('test_gauge_labels', 'With labels', ['env']);
      g.set(100, { env: 'prod' });
      g.set(5, { env: 'dev' });
      assert.equal(g.get({ env: 'prod' }), 100);
      assert.equal(g.get({ env: 'dev' }), 5);
    });
  });

  describe('Histogram', () => {
    let beacon, dir;
    before(() => {
      dir = tempDir();
      beacon = createBeacon({ dataDir: dir });
    });
    after(() => {
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('observes values into buckets', () => {
      const h = beacon.histogram('test_hist', 'A histogram', [], [0.1, 0.5, 1.0]);
      h.observe(0.05);
      h.observe(0.3);
      h.observe(0.8);
      h.observe(2.0);
      const output = h.collect();
      assert.ok(output.includes('test_hist_bucket{le="0.1"} 1'));
      assert.ok(output.includes('test_hist_bucket{le="0.5"} 2'));
      assert.ok(output.includes('test_hist_bucket{le="1"} 3'));
      assert.ok(output.includes('test_hist_bucket{le="+Inf"} 4'));
      assert.ok(output.includes('test_hist_count 4'));
    });
  });

  describe('parseLine', () => {
    it('parses simple metric', () => {
      const result = parseLine('my_metric 42');
      assert.deepEqual(result, { name: 'my_metric', labels: {}, value: 42, timestamp: undefined });
    });

    it('parses metric with labels', () => {
      const result = parseLine('http_requests{method="GET",status="200"} 150');
      assert.equal(result.name, 'http_requests');
      assert.deepEqual(result.labels, { method: 'GET', status: '200' });
      assert.equal(result.value, 150);
    });

    it('parses metric with timestamp', () => {
      const result = parseLine('cpu_usage 0.75 1709312400000');
      assert.equal(result.value, 0.75);
      assert.equal(result.timestamp, 1709312400000);
    });

    it('returns null for comments', () => {
      assert.equal(parseLine('# HELP something'), null);
    });

    it('returns null for empty lines', () => {
      assert.equal(parseLine(''), null);
    });
  });

  describe('MetricBeacon', () => {
    let beacon, dir;
    before(() => {
      dir = tempDir();
      beacon = createBeacon({ dataDir: dir });
    });
    after(() => {
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('returns existing metric on duplicate registration', () => {
      const c1 = beacon.counter('dup_counter', 'First');
      const c2 = beacon.counter('dup_counter', 'Second');
      assert.strictEqual(c1, c2);
    });

    it('exposes all metrics in Prometheus format', () => {
      const c = beacon.counter('expose_c', 'Counter');
      const g = beacon.gauge('expose_g', 'Gauge');
      c.inc();
      g.set(99);
      const output = beacon.expose();
      assert.ok(output.includes('expose_c'));
      assert.ok(output.includes('expose_g'));
    });

    it('ingests external metric lines', () => {
      beacon.ingest('external_metric{source="test"} 42');
      const output = beacon.expose();
      assert.ok(output.includes('external_metric'));
      assert.ok(output.includes('42'));
    });

    it('reports metric count', () => {
      const count = beacon.metricCount();
      assert.ok(count > 0);
    });
  });

  describe('HTTP Server', () => {
    let beacon, dir, server;
    before(async () => {
      dir = tempDir();
      beacon = createBeacon({ dataDir: dir });
      beacon.counter('server_test', 'Server test counter').inc({}, 7);
      server = await beacon.serve(0); // random port
    });
    after(() => {
      server.close();
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('serves /metrics endpoint', async () => {
      const port = server.address().port;
      const res = await fetch(`http://localhost:${port}/metrics`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('server_test'));
      assert.ok(text.includes('7'));
    });

    it('accepts POST /ingest', async () => {
      const port = server.address().port;
      const res = await fetch(`http://localhost:${port}/ingest`, {
        method: 'POST',
        body: 'pushed_metric{env="test"} 99\n',
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ingested, 1);
    });

    it('serves /health endpoint', async () => {
      const port = server.address().port;
      const res = await fetch(`http://localhost:${port}/health`);
      const json = await res.json();
      assert.equal(json.status, 'ok');
      assert.ok(json.metrics > 0);
    });
  });

  describe('Storage persistence', () => {
    it('persists time-series to text files', () => {
      const dir = tempDir();
      const beacon = createBeacon({ dataDir: dir });
      const c = beacon.counter('persist_counter', 'Persisted');
      c.inc();
      c.inc();
      const series = beacon.storage.readSeries('persist_counter');
      assert.equal(series.length, 2);
      assert.ok(series[0].includes('persist_counter'));
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it('persists metric metadata to SQLite', () => {
      const dir = tempDir();
      const beacon = createBeacon({ dataDir: dir });
      beacon.counter('meta_counter', 'Has metadata', ['env', 'service']);
      const meta = beacon.storage.getMetric('meta_counter');
      assert.equal(meta.type, 'counter');
      assert.equal(meta.help, 'Has metadata');
      assert.deepEqual(meta.label_names, ['env', 'service']);
      beacon.close();
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
