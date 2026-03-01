// dashboard.mjs — Simple HTML dashboard that visualizes current metric state

import { groupByName } from './parser.mjs';

export function generateDashboard(pollResult, alerts = []) {
  const groups = groupByName(pollResult.metrics);
  const timestamp = pollResult.timestamp;

  let metricsHtml = '';
  for (const [name, group] of groups) {
    const rows = group.series.map(s => {
      const labelStr = Object.entries(s.labels)
        .map(([k, v]) => `<span class="label">${esc(k)}=&quot;${esc(v)}&quot;</span>`)
        .join(', ');
      return `<tr><td>${labelStr || '<em>no labels</em>'}</td><td class="value">${s.value}</td></tr>`;
    }).join('\n');

    metricsHtml += `
    <div class="metric-card">
      <h3>${esc(name)} <span class="type">${esc(group.type)}</span></h3>
      ${group.help ? `<p class="help">${esc(group.help)}</p>` : ''}
      <table>
        <thead><tr><th>Labels</th><th>Value</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  let alertsHtml = '';
  if (alerts.length > 0) {
    const alertRows = alerts.map(a => `
      <tr class="alert-${esc(a.severity)}">
        <td><span class="severity ${esc(a.severity)}">${esc(a.severity)}</span></td>
        <td>${esc(a.metric)}</td>
        <td>${esc(a.message)}</td>
        <td class="value">${a.value}</td>
      </tr>`).join('\n');

    alertsHtml = `
    <div class="alerts-section">
      <h2>Alerts (${alerts.length})</h2>
      <table>
        <thead><tr><th>Severity</th><th>Metric</th><th>Message</th><th>Value</th></tr></thead>
        <tbody>${alertRows}</tbody>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Metric Snapshot Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e1e4e8; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: #8b949e; font-size: 0.85rem; margin-bottom: 24px; }
    .metric-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .metric-card h3 { font-size: 1rem; margin-bottom: 8px; color: #58a6ff; }
    .type { font-size: 0.75rem; background: #1f2937; color: #8b949e; padding: 2px 6px; border-radius: 4px; font-weight: normal; }
    .help { color: #8b949e; font-size: 0.85rem; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 12px; text-align: left; border-bottom: 1px solid #21262d; }
    th { color: #8b949e; font-size: 0.8rem; text-transform: uppercase; }
    .value { font-family: 'SF Mono', SFMono-Regular, Consolas, monospace; color: #7ee787; text-align: right; }
    .label { font-family: 'SF Mono', SFMono-Regular, Consolas, monospace; font-size: 0.85rem; color: #d2a8ff; }
    .alerts-section { background: #1c1410; border: 1px solid #533a1e; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .alerts-section h2 { color: #f0883e; margin-bottom: 12px; }
    .severity { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .critical { background: #6e1b1b; color: #f85149; }
    .warning { background: #533a1e; color: #f0883e; }
    .info { background: #1a3a5c; color: #58a6ff; }
    .alert-critical { background: rgba(248, 81, 73, 0.05); }
    .alert-warning { background: rgba(240, 136, 62, 0.05); }
    .status-bar { display: flex; gap: 16px; color: #8b949e; font-size: 0.8rem; margin-bottom: 24px; }
    .status-bar span { background: #161b22; padding: 4px 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Metric Snapshot Dashboard</h1>
  <p class="subtitle">Endpoint: ${esc(pollResult.endpoint)}</p>
  <div class="status-bar">
    <span>Snapshot: ${esc(timestamp)}</span>
    <span>Metrics: ${groups.size}</span>
    <span>Series: ${pollResult.metrics.length}</span>
    ${alerts.length > 0 ? `<span style="color:#f85149">Alerts: ${alerts.length}</span>` : '<span style="color:#7ee787">No alerts</span>'}
  </div>
  ${alertsHtml}
  <h2 style="margin-bottom:12px">Metrics</h2>
  ${metricsHtml}
</body>
</html>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
