// middleware.mjs — Express middleware for automatic request metrics

export function createMiddleware(beacon) {
  const requestsTotal = beacon.counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'route', 'status_code']
  );
  const requestDuration = beacon.histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'route']
  );
  const requestsInFlight = beacon.gauge(
    'http_requests_in_flight',
    'Number of HTTP requests currently being processed'
  );

  return function metricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    requestsInFlight.inc();

    const onFinish = () => {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onFinish);

      requestsInFlight.dec();

      const route = req.route?.path || req.path || 'unknown';
      const method = req.method;
      const statusCode = String(res.statusCode);

      requestsTotal.inc({ method, route, status_code: statusCode });

      const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
      requestDuration.observe(elapsed, { method, route });
    };

    res.on('finish', onFinish);
    res.on('close', onFinish);
    next();
  };
}
