// example/usage.mjs — How to use metric-beacon in your project
import { createBeacon } from '../src/index.mjs';
import express from 'express';

// 1. Create a beacon instance
const beacon = createBeacon({ dataDir: './data/metrics' });

// 2. Register metrics
const requestsTotal = beacon.counter(
  'http_requests_total',
  'Total number of HTTP requests',
  ['method', 'path', 'status_code']
);

const responseTime = beacon.histogram(
  'http_response_time_seconds',
  'HTTP response time in seconds',
  ['method', 'path']
);

const activeUsers = beacon.gauge(
  'active_users',
  'Number of currently active users'
);

// 3. Use metrics in your application
requestsTotal.inc({ method: 'GET', path: '/api/users', status_code: '200' });
requestsTotal.inc({ method: 'GET', path: '/api/users', status_code: '200' });
requestsTotal.inc({ method: 'POST', path: '/api/users', status_code: '201' });

responseTime.observe(0.125, { method: 'GET', path: '/api/users' });
responseTime.observe(0.340, { method: 'POST', path: '/api/users' });

activeUsers.set(42);

// 4. Print current metrics (Prometheus format)
console.log('=== Current Metrics ===\n');
console.log(beacon.expose());

// 5. Or embed in an Express app with auto-tracking middleware
const app = express();

// Auto-track all requests
app.use(beacon.middleware());

// Expose metrics endpoint
app.get('/metrics', beacon.handler());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from metric-beacon example!' });
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
  console.log(`Metrics at http://localhost:${port}/metrics`);

  // Clean up after 5 seconds (for demo purposes)
  setTimeout(() => {
    server.close();
    beacon.close();
    console.log('\nExample finished.');
  }, 5000);
});
