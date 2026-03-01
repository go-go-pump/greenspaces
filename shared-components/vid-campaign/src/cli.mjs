#!/usr/bin/env node

/**
 * vid-campaign CLI — Video campaign lifecycle manager
 *
 * Usage:
 *   node src/cli.mjs create --topic "Topic" --videos 5
 *   node src/cli.mjs run --topic "Topic" --auto-publish
 *   node src/cli.mjs status --campaign-id <id>
 */

import { createCampaign, runCampaign, advanceCampaign, getCampaignStatus } from './campaign.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('--') ? args[0] : 'help';
  const opts = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--topic':        opts.topic = next; i++; break;
      case '--keyword':      opts.keyword = next; i++; break;
      case '--videos':       opts.videoCount = parseInt(next, 10); i++; break;
      case '--schedule':     opts.schedule = next; i++; break;
      case '--auto-publish': opts.autoPublish = true; break;
      case '--style':        (opts.vidgenConfig ??= {}).style = next; i++; break;
      case '--voice':        (opts.vidgenConfig ??= {}).voice = next; i++; break;
      case '--campaign-id':  opts.campaignId = next; i++; break;
      case '--dry-run':      opts.dryRun = true; break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return { command, opts };
}

function printHelp() {
  console.log(`
vid-campaign — Video campaign lifecycle manager

Usage:
  node src/cli.mjs <command> [options]

Commands:
  create     Create a new campaign (returns campaign JSON)
  run        Create and run a full campaign end-to-end
  status     Show campaign status (requires --campaign-id or piped JSON)
  help       Show this help

Create/Run options:
  --topic <text>           Campaign topic/theme (required)
  --keyword <text>         Target keyword for research (defaults to topic)
  --videos <count>         Number of videos to produce (default: 3)
  --schedule <interval>    daily | weekly | biweekly (default: weekly)
  --auto-publish           Publish without manual review
  --style <preset>         vidgen style preset
  --voice <preset>         vidgen voice preset
  --dry-run                Simulate without producing/publishing

Status options:
  --campaign-id <id>       Campaign ID to check

  --help                   Show this help
`);
}

async function main() {
  const { command, opts } = parseArgs(process.argv);

  switch (command) {
    case 'create': {
      if (!opts.topic) {
        console.error('Error: --topic is required');
        process.exit(1);
      }
      const campaign = createCampaign(opts);
      console.log(JSON.stringify(campaign, null, 2));
      break;
    }

    case 'run': {
      if (!opts.topic) {
        console.error('Error: --topic is required');
        process.exit(1);
      }
      if (opts.dryRun) {
        console.log('[vid-campaign] DRY RUN — simulating campaign');
        const campaign = createCampaign(opts);
        console.log('[vid-campaign] Would advance through: research → produce → publish → monitor → complete');
        console.log(JSON.stringify(getCampaignStatus(campaign), null, 2));
        break;
      }
      const campaign = await runCampaign(opts);
      console.log(JSON.stringify(campaign, null, 2));
      break;
    }

    case 'status': {
      // Read campaign JSON from stdin if no campaign-id
      if (!opts.campaignId) {
        console.error('Error: --campaign-id is required (or pipe campaign JSON via stdin)');
        process.exit(1);
      }
      console.log(`Campaign ${opts.campaignId} — use programmatic API for full status`);
      break;
    }

    case 'help':
    default:
      printHelp();
  }
}

main().catch(err => {
  console.error(`[vid-campaign] Fatal error: ${err.message}`);
  process.exit(1);
});
