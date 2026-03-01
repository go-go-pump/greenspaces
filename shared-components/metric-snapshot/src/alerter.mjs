// alerter.mjs — Alert output: write to file or call webhook

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export class Alerter {
  constructor(options = {}) {
    this.alertDir = options.alertDir || './alerts';
    this.webhookUrl = options.webhookUrl || null;
    mkdirSync(this.alertDir, { recursive: true });
  }

  async fire(alerts) {
    if (alerts.length === 0) return;

    // Write to file
    this._writeToFile(alerts);

    // Call webhook if configured
    if (this.webhookUrl) {
      await this._callWebhook(alerts);
    }

    return alerts;
  }

  _writeToFile(alerts) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `alerts-${timestamp}.txt`;
    const filepath = join(this.alertDir, filename);

    const lines = alerts.map(a =>
      `[${a.severity.toUpperCase()}] ${a.metric} — ${a.message} (value: ${a.value}, threshold: ${a.threshold})`
    );

    const content = [
      `# Alerts fired at ${new Date().toISOString()}`,
      `# Count: ${alerts.length}`,
      '',
      ...lines,
      '',
    ].join('\n');

    writeFileSync(filepath, content);

    // Also append to rolling alert log
    appendFileSync(join(this.alertDir, 'alert-log.txt'), content + '\n');

    return filepath;
  }

  async _callWebhook(alerts) {
    const payload = {
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      alerts: alerts.map(a => ({
        severity: a.severity,
        metric: a.metric,
        labels: a.labels,
        value: a.value,
        threshold: a.threshold,
        message: a.message,
      })),
    };

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Webhook call failed: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error(`Webhook call error: ${err.message}`);
    }
  }
}
