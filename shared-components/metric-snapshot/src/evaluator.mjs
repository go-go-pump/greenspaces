// evaluator.mjs — Threshold evaluation engine

import { readFileSync } from 'node:fs';
import { groupByName } from './parser.mjs';

// Rule format:
// {
//   metric: 'http_requests_total',
//   labels: { status_code: '500' },    // optional: match specific label values
//   condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq',
//   threshold: 100,
//   severity: 'critical' | 'warning' | 'info',
//   message: 'Too many 500 errors',
// }

const CONDITIONS = {
  gt: (v, t) => v > t,
  lt: (v, t) => v < t,
  gte: (v, t) => v >= t,
  lte: (v, t) => v <= t,
  eq: (v, t) => v === t,
  neq: (v, t) => v !== t,
};

export function evaluate(metrics, rules) {
  const groups = groupByName(metrics);
  const alerts = [];

  for (const rule of rules) {
    const group = groups.get(rule.metric);
    if (!group) continue;

    const condFn = CONDITIONS[rule.condition];
    if (!condFn) continue;

    for (const series of group.series) {
      // If rule specifies labels, check they match
      if (rule.labels) {
        const matches = Object.entries(rule.labels).every(
          ([k, v]) => series.labels[k] === v
        );
        if (!matches) continue;
      }

      if (condFn(series.value, rule.threshold)) {
        alerts.push({
          rule,
          metric: series.name,
          labels: series.labels,
          value: series.value,
          threshold: rule.threshold,
          severity: rule.severity || 'warning',
          message: rule.message || `${series.name} ${rule.condition} ${rule.threshold} (value: ${series.value})`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

// Load rules from a JSON file or object
export function loadRules(source) {
  if (typeof source === 'string') {
    return JSON.parse(readFileSync(source, 'utf-8'));
  }
  return source;
}
