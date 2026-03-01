#!/usr/bin/env node
// cli.mjs — Standalone metric-beacon server
import { createBeacon } from './index.mjs';

const args = process.argv.slice(2);
let port = 9090;
let dataDir = './data/metrics';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) port = parseInt(args[i + 1], 10);
  if (args[i] === '--data-dir' && args[i + 1]) dataDir = args[i + 1];
  if (args[i] === '--help') {
    console.log(`metric-beacon — Lightweight metric publisher

Usage: node src/cli.mjs [options]

Options:
  --port <n>       HTTP port (default: 9090)
  --data-dir <d>   Data directory (default: ./data/metrics)
  --help           Show this help
`);
    process.exit(0);
  }
}

const beacon = createBeacon({ dataDir });
await beacon.serve(port);

process.on('SIGINT', () => {
  console.log('\nShutting down metric-beacon...');
  beacon.close();
  process.exit(0);
});
