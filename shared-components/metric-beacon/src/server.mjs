// server.mjs — Express HTTP server for metric exposition and ingestion
import express from 'express';

export function createServer(beacon, options = {}) {
  const app = express();
  app.use(express.text({ type: '*/*', limit: '1mb' }));

  // GET /metrics — Prometheus text exposition
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(beacon.expose());
  });

  // POST /ingest — Accept metric lines from external systems
  app.post('/ingest', (req, res) => {
    const body = typeof req.body === 'string' ? req.body : String(req.body);
    const lines = body.trim().split('\n').filter(l => l && !l.startsWith('#'));

    let ingested = 0;
    for (const line of lines) {
      try {
        beacon.ingest(line);
        ingested++;
      } catch (err) {
        // Skip malformed lines
      }
    }

    res.json({ ingested, total: lines.length });
  });

  // GET /health — Simple health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', metrics: beacon.metricCount() });
  });

  return app;
}

export function startServer(beacon, port = 9090) {
  const app = createServer(beacon);
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`metric-beacon listening on http://localhost:${port}`);
      console.log(`  GET  /metrics  — Prometheus exposition`);
      console.log(`  POST /ingest   — Push metric lines`);
      console.log(`  GET  /health   — Health check`);
      resolve(server);
    });
  });
}
