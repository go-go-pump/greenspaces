# vidgen

Automated video generation pipeline — takes a topic prompt and produces an MP4 slideshow video with AI narration, images, B-roll, music, sound effects, and YouTube-ready metadata.

**Input:** Topic string + optional layer configuration

**Output:** MP4 video + thumbnail + metadata (title, description, tags)

## Quick Start

```bash
# 1. Install dependencies
npm install
pip3 install edge-tts
brew install ffmpeg    # macOS

# 2. Configure API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (required)
# Add optional keys: OPENAI_API_KEY, PEXELS_API_KEY, HEYGEN_API_KEY

# 3. Generate a basic video
npx ts-node src/cli.ts "5 Science-Backed Tips for Better Sleep"

# 4. With style + voice customization
npx ts-node src/cli.ts "5 Tips for Better Sleep" --style vibrant --voice energetic

# 5. Enhanced tier (images + music)
npx ts-node src/cli.ts "5 Tips for Better Sleep" --enhanced

# 6. Premium tier (images + B-roll + music + SFX)
npx ts-node src/cli.ts "5 Tips for Better Sleep" --premium

# 7. Full custom
npx ts-node src/cli.ts "5 Tips for Better Sleep" --style corporate --voice calm --images --music epic --sfx
```

Output appears in `./output/{jobId}/`:
- `video.mp4` — narrated slideshow (3-4 min)
- `thumbnail.jpg` — 1280x720 YouTube thumbnail
- `metadata.json` — title, description, tags, timestamps
- `pipeline-result.json` — timing and cost breakdown

## CLI Options

```
Layer Options:
  --style <preset|path>    Style preset or JSON file (default, corporate, vibrant, minimal, warm)
  --voice <preset>         Voice preset (professional, friendly, energetic, calm, authoritative)
  --images                 Enable AI image generation (requires OPENAI_API_KEY)
  --broll                  Enable stock B-roll video (requires PEXELS_API_KEY)
  --avatar <id>            Enable HeyGen avatar (requires HEYGEN_API_KEY)
  --music [mood]           Enable background music (calm, energetic, corporate, epic, dramatic)
  --music-file <path>      Use a local music file
  --sfx                    Enable sound effects (transition swooshes, stings)

Tier Presets:
  --enhanced               Images + music
  --premium                Images + B-roll + music + SFX
```

## Pipeline

```
Topic → Research (Claude Haiku + web search)
      → Script (Claude Sonnet → structured narration + slide types)
      → Slides (HTML builders + StyleGuide → Puppeteer → PNG 1920x1080)
      → Images (optional: DALL-E 3 → Sharp composite onto slides)
      → B-Roll (optional: Pexels HD stock → FFmpeg trim)
      → Avatar (optional: HeyGen → green screen overlay)
      → Audio (edge-tts + voice profile → per-section MP3)
      → Mix (optional: voice + music + SFX → FFmpeg filter_complex)
      → Video (FFmpeg → MP4 1920x1080 24fps)
      → Thumbnail (Sharp) + Metadata (Claude)
```

## Style Presets

| Preset | Description |
|---|---|
| `default` | Dark purple gradient, white text, purple accents |
| `corporate` | Navy blue, clean and professional |
| `vibrant` | Deep teal to purple, bright coral accents |
| `minimal` | Near-black, subtle gray, clean typography |
| `warm` | Dark brown tones, golden amber accents |

## Voice Presets

| Preset | Personality | Voice |
|---|---|---|
| `professional` | Authoritative, clear | en-US-GuyNeural |
| `friendly` | Warm, approachable | en-US-JennyNeural |
| `energetic` | Upbeat, enthusiastic | en-US-TonyNeural |
| `calm` | Soothing, measured | en-US-AriaNeural |
| `authoritative` | Deep, commanding | en-US-DavisNeural |

## Layer Architecture

```
Layer 5: Music & SFX ──── Ambient gen, transition swoosh, stings, multi-track mixer
Layer 4: Avatar ────────── HeyGen API, green screen, chroma key PiP overlay
Layer 3: Video B-Roll ──── Pexels stock video, FFmpeg trim, opacity overlay
Layer 2: Image Gen ─────── DALL-E 3, Sharp compositing (bg/overlay/side)
Layer 1: Core Video ────── Configurable slides (5 styles), voice profiles (5 presets)
Layer 0: POC ───────────── Pipeline (research → script → slides → audio → video)  ✓
```

All layers are optional and degrade gracefully — the pipeline always completes with whatever API keys are available.

## API Keys & Cost

| Key | Layer | Where to Get | Cost |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Required | [console.anthropic.com](https://console.anthropic.com) | ~$0.14/video |
| `OPENAI_API_KEY` | Images | [platform.openai.com](https://platform.openai.com) | +$0.12-0.32/video |
| `PEXELS_API_KEY` | B-Roll | [pexels.com/api](https://www.pexels.com/api/) | Free |
| `HEYGEN_API_KEY` | Avatar | [heygen.com](https://www.heygen.com/) | +$1.50-2.50/video |
| `PIXABAY_API_KEY` | Music (future) | [pixabay.com/api/docs](https://pixabay.com/api/docs/) | Free |

Music and SFX are generated locally via FFmpeg — no API key needed.

## Docs

- [Architecture](docs/ARCHITECTURE.md) — system diagram, pipeline flow, integration points
- [Setup Guide](docs/SETUP.md) — detailed environment setup
- [Testing Guide](docs/TESTING.md) — per-layer testing instructions and verification
- [Roadmap](docs/TODO.md) — feature roadmap and implementation checklist
- [Changelog](CHANGELOG.md) — versioned release history
- [Spec](docs/VIDEO-GENERATOR-HANDOFF.md) — full system specification
