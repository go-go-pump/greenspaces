// poller.mjs — Poll metric-beacon /metrics endpoint

import { parseExposition } from './parser.mjs';

export async function pollMetrics(endpoint) {
  const url = endpoint.endsWith('/metrics') ? endpoint : `${endpoint}/metrics`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to poll ${url}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const metrics = parseExposition(text);

  return {
    endpoint: url,
    timestamp: new Date().toISOString(),
    epochMs: Date.now(),
    raw: text,
    metrics,
  };
}
