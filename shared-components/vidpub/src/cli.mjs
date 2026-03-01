#!/usr/bin/env node

/**
 * vidpub CLI — YouTube video publishing
 *
 * Usage:
 *   node src/cli.mjs <video-path> --title "Title" --description "Desc" [options]
 */

import { publish } from './publish.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { videoPath: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith('--') && !opts.videoPath) {
      opts.videoPath = arg;
      continue;
    }

    const next = args[i + 1];
    switch (arg) {
      case '--title':       opts.title = next; i++; break;
      case '--description': opts.description = next; i++; break;
      case '--tags':        opts.tags = next.split(',').map(t => t.trim()); i++; break;
      case '--thumbnail':   opts.thumbnailPath = next; i++; break;
      case '--category':    opts.categoryId = parseInt(next, 10); i++; break;
      case '--language':    opts.language = next; i++; break;
      case '--privacy':     opts.privacy = next; i++; break;
      case '--schedule':    opts.scheduleAt = next; i++; break;
      case '--playlist':    opts.playlistId = next; i++; break;
      case '--method':      opts.method = next; i++; break;
      case '--notify':      opts.notifySubscribers = true; break;
      case '--no-notify':   opts.notifySubscribers = false; break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
vidpub — YouTube video publishing

Usage:
  node src/cli.mjs <video-path> [options]

Required:
  <video-path>               Path to the video file (MP4)

Metadata:
  --title <text>             Video title (max 100 chars)
  --description <text>       Video description
  --tags <csv>               Comma-separated tags
  --thumbnail <path>         Custom thumbnail image (JPEG/PNG)
  --category <id>            YouTube category ID (default: 22)
  --language <code>          Video language (default: en)

Publishing:
  --privacy <level>          public | unlisted | private (default: public)
  --schedule <iso-datetime>  Schedule publish time (ISO 8601)
  --playlist <id>            Add to playlist after upload
  --notify / --no-notify     Notify subscribers (default: true)

Method:
  --method <api|puppeteer>   Upload method (default: api, falls back to puppeteer)

  --help                     Show this help
`);
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.videoPath) {
    console.error('Error: video path is required');
    printHelp();
    process.exit(1);
  }

  if (!opts.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }

  console.log(`[vidpub] Publishing: ${opts.title}`);
  const result = await publish(opts);

  if (result.status === 'failed') {
    console.error(`[vidpub] FAILED: ${result.error}`);
    process.exit(1);
  }

  console.log(`[vidpub] ${result.status.toUpperCase()}`);
  console.log(`  Video ID: ${result.videoId}`);
  console.log(`  URL:      ${result.url}`);
  console.log(`  Method:   ${result.method}`);
  console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  if (result.quotaUsed > 0) {
    console.log(`  Quota:    ${result.quotaUsed} units`);
  }

  // Output JSON to stdout for programmatic consumption
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(`[vidpub] Fatal error: ${err.message}`);
  process.exit(1);
});
