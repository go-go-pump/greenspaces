// snapshot.mjs — Save/load snapshots as TXT files

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export class SnapshotStore {
  constructor(dir = './snapshots') {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }

  save(pollResult) {
    const ts = pollResult.timestamp.replace(/[:.]/g, '-');
    const filename = `snapshot-${ts}.txt`;
    const filepath = join(this.dir, filename);

    const content = [
      `# Metric Snapshot`,
      `# Endpoint: ${pollResult.endpoint}`,
      `# Timestamp: ${pollResult.timestamp}`,
      `# Epoch: ${pollResult.epochMs}`,
      `# Metric count: ${pollResult.metrics.length}`,
      ``,
      pollResult.raw,
    ].join('\n');

    writeFileSync(filepath, content);

    // Also save as "latest.txt" for easy access
    writeFileSync(join(this.dir, 'latest.txt'), content);

    return filepath;
  }

  loadLatest() {
    const filepath = join(this.dir, 'latest.txt');
    if (!existsSync(filepath)) return null;
    return readFileSync(filepath, 'utf-8');
  }

  load(filename) {
    const filepath = join(this.dir, filename);
    if (!existsSync(filepath)) return null;
    return readFileSync(filepath, 'utf-8');
  }

  list() {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.txt'))
      .sort()
      .reverse();
  }
}
