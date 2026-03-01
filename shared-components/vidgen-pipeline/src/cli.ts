import * as fs from 'fs';
import * as path from 'path';
import { runPipeline, runPreview, resumePipeline } from './pipeline';
import { VideoConfig } from './types';
import { STYLE_PRESETS, DEFAULT_STYLE } from './presets/styles';
import { VOICE_PRESETS, PROFESSIONAL_VOICE } from './presets/voices';
import { DEFAULT_VIDEO_CONFIG, SHORT_VIDEO_CONFIG, DEFAULT_CAPTION_CONFIG } from './presets/defaults';

function parseArgs(argv: string[]): {
  topic: string;
  config: Partial<VideoConfig>;
  preview: boolean;
  previewDurationSec?: number;
  resumeJobId?: string;
} {
  const args = argv.slice(2);
  const vc: Partial<VideoConfig> = {};
  const topicParts: string[] = [];
  let preview = false;
  let previewDurationSec: number | undefined;
  let resumeJobId: string | undefined;
  let i = 0;

  while (i < args.length) {
    switch (args[i]) {
      case '--style': {
        const val = args[++i];
        if (STYLE_PRESETS[val]) {
          vc.style = STYLE_PRESETS[val];
        } else if (fs.existsSync(val)) {
          const raw = JSON.parse(fs.readFileSync(path.resolve(val), 'utf-8'));
          vc.style = { ...DEFAULT_STYLE, ...raw, name: raw.name || 'custom',
            colors: { ...DEFAULT_STYLE.colors, ...raw.colors },
            fonts: { ...DEFAULT_STYLE.fonts, ...raw.fonts },
            layout: { ...DEFAULT_STYLE.layout, ...raw.layout },
          };
        } else {
          exitError(`Unknown style "${val}". Presets: ${Object.keys(STYLE_PRESETS).join(', ')}`);
        }
        break;
      }
      case '--voice': {
        const val = args[++i];
        if (VOICE_PRESETS[val]) {
          vc.voice = VOICE_PRESETS[val];
        } else {
          exitError(`Unknown voice "${val}". Presets: ${Object.keys(VOICE_PRESETS).join(', ')}`);
        }
        break;
      }
      case '--images':
        vc.images = { ...DEFAULT_VIDEO_CONFIG.images, enabled: true };
        break;
      case '--broll':
        vc.broll = { ...DEFAULT_VIDEO_CONFIG.broll, enabled: true };
        break;
      case '--avatar': {
        const avatarId = args[++i];
        vc.avatar = { ...DEFAULT_VIDEO_CONFIG.avatar, ...vc.avatar, enabled: true, avatarId };
        break;
      }
      case '--avatar-voice': {
        const voiceId = args[++i];
        if (!vc.avatar) vc.avatar = { ...DEFAULT_VIDEO_CONFIG.avatar };
        vc.avatar = { ...vc.avatar, useAvatarVoice: true, voiceId };
        break;
      }
      case '--avatar-looks': {
        const lookIds = args[++i].split(',').map(s => s.trim());
        if (!vc.avatar) vc.avatar = { ...DEFAULT_VIDEO_CONFIG.avatar };
        vc.avatar = { ...vc.avatar, lookIds };
        break;
      }
      case '--music':
        vc.music = { ...DEFAULT_VIDEO_CONFIG.music, enabled: true };
        if (args[i + 1] && !args[i + 1].startsWith('--')) {
          const mood = args[++i];
          vc.music.mood = mood;
        }
        break;
      case '--music-file': {
        const filePath = args[++i];
        vc.music = { ...DEFAULT_VIDEO_CONFIG.music, enabled: true, provider: 'file', filePath };
        break;
      }
      case '--sfx':
        vc.sfx = { ...DEFAULT_VIDEO_CONFIG.sfx, enabled: true };
        break;
      case '--captions':
        vc.captions = { ...DEFAULT_CAPTION_CONFIG, enabled: true };
        break;
      case '--no-captions':
        vc.captions = { ...DEFAULT_CAPTION_CONFIG, enabled: false };
        break;
      case '--config': {
        const cfgPath = path.resolve(args[++i]);
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as Partial<VideoConfig>;
        Object.assign(vc, cfg);
        break;
      }
      case '--enhanced':
        // Quick preset: style + voice + images + music
        if (!vc.style) vc.style = DEFAULT_STYLE;
        if (!vc.voice) vc.voice = PROFESSIONAL_VOICE;
        vc.images = { ...DEFAULT_VIDEO_CONFIG.images, enabled: true };
        vc.music = { ...DEFAULT_VIDEO_CONFIG.music, enabled: true };
        break;
      case '--premium':
        // Quick preset: everything enabled
        if (!vc.style) vc.style = DEFAULT_STYLE;
        if (!vc.voice) vc.voice = PROFESSIONAL_VOICE;
        vc.images = { ...DEFAULT_VIDEO_CONFIG.images, enabled: true };
        vc.broll = { ...DEFAULT_VIDEO_CONFIG.broll, enabled: true };
        vc.music = { ...DEFAULT_VIDEO_CONFIG.music, enabled: true };
        vc.sfx = { ...DEFAULT_VIDEO_CONFIG.sfx, enabled: true };
        break;
      case '--short':
        Object.assign(vc, SHORT_VIDEO_CONFIG);
        break;
      case '--portrait':
        vc.aspectRatio = '9:16';
        break;
      case '--preview':
        preview = true;
        break;
      case '--duration': {
        const dur = parseFloat(args[++i]);
        if (isNaN(dur) || dur <= 0) {
          exitError('--duration requires a positive number (seconds)');
        }
        previewDurationSec = dur;
        break;
      }
      case '--resume': {
        resumeJobId = args[++i];
        if (!resumeJobId) {
          exitError('--resume requires a job ID');
        }
        break;
      }
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        topicParts.push(args[i]);
    }
    i++;
  }

  return { topic: topicParts.join(' ').trim(), config: vc, preview, previewDurationSec, resumeJobId };
}

function exitError(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function printUsage(): void {
  console.log(`
Usage: npx ts-node src/cli.ts "topic" [options]

Layer Options:
  --style <preset|path>    Style preset or JSON file (default, corporate, vibrant, minimal, warm)
  --voice <preset>         Voice preset (professional, friendly, energetic, calm, authoritative)
  --images                 Enable AI image generation (requires OPENAI_API_KEY)
  --broll                  Enable stock B-roll video (requires PEXELS_API_KEY)
  --avatar <id>            Enable HeyGen avatar (requires HEYGEN_API_KEY)
  --avatar-voice <id>      Use HeyGen voice instead of edge-tts (synced lips)
  --avatar-looks <ids>     Comma-separated look IDs to rotate per section
  --music [mood]           Enable background music (mood: calm, energetic, corporate, epic, dramatic)
  --music-file <path>      Use a local music file
  --sfx                    Enable sound effects (transition swooshes, stings)
  --captions               Enable word-by-word captions (requires OPENAI_API_KEY, portrait only)
  --no-captions            Disable captions (even in short mode)

Format:
  --short                  SHORT mode: 9:16 portrait, fast-paced, 30-60s, punchy content
  --portrait               9:16 portrait output (1080x1920) for Shorts/TikTok/Reels
  --preview                Quick test video (no API calls, silent narration, hardcoded script)
  --duration <seconds>     Target duration for preview mode (default: ~10s)

Tier Presets:
  --enhanced               Images + music (Enhanced tier)
  --premium                Images + B-roll + music + SFX (Premium tier)

Other:
  --config <path>          Full config JSON file
  --resume <jobId>         Resume a pipeline with pending HeyGen avatar clips
  --help                   Show this help

Examples:
  npx ts-node src/cli.ts "5 Tips for Better Sleep"
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --style vibrant --voice energetic
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --music calm --sfx
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --enhanced --style corporate
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --premium --voice friendly
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --portrait --music calm
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --short
  npx ts-node src/cli.ts "5 Tips for Better Sleep" --short --music calm
  npx ts-node src/cli.ts --preview --music calm --sfx --duration 5

Required API keys (add to .env):
  ANTHROPIC_API_KEY        Always required (research, script, metadata)
  OPENAI_API_KEY           For --images (DALL-E 3)
  PEXELS_API_KEY           For --broll (free stock video)
  HEYGEN_API_KEY           For --avatar
`);
}

async function main() {
  const { topic, config: vc, preview, previewDurationSec, resumeJobId } = parseArgs(process.argv);

  if (!topic && !preview && !resumeJobId) {
    printUsage();
    process.exit(1);
  }

  try {
    if (resumeJobId) {
      await resumePipeline(resumeJobId);
    } else if (preview) {
      await runPreview(topic || 'Preview Test', vc, previewDurationSec);
    } else {
      await runPipeline(topic, vc);
    }
  } catch (error: any) {
    console.error('\nPipeline failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
