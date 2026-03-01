# Testing Guide

## Prerequisites

Before testing, ensure you have:
- Node.js >= 18.17 (recommended: v20 LTS)
- FFmpeg installed (`brew install ffmpeg` on macOS)
- Python 3 with edge-tts (`pip install edge-tts`)
- `ANTHROPIC_API_KEY` in `.env` (required for all tests)

TypeScript compilation check:
```bash
npx tsc --noEmit
```

---

## Layer 0: Basic Pipeline (No Optional APIs)

**Requirements:** `ANTHROPIC_API_KEY` only

```bash
npx ts-node src/cli.ts "5 Science-Backed Tips for Better Sleep"
```

**Expected:** 7-8 steps complete in ~90-120s. Output in `./output/{jobId}/`.

**Verify:**
- `video.mp4` plays in QuickTime/VLC, 1920x1080, 24fps, 2-4 min duration
- Slides change at correct times matching narration
- Audio is clear, natural-sounding speech
- All 7 slide types appear (title, stats, list, comparison, process, warning, cta)
- `thumbnail.jpg` is 1280x720
- `metadata.json` has title, description, tags (15-20), timestamps

**Cost:** ~$0.14

---

## Layer 1: Style & Voice Customization

**Requirements:** `ANTHROPIC_API_KEY` only (same as Layer 0)

### Test style presets
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --style vibrant --voice energetic
```

### Test all available presets
Styles: `default`, `corporate`, `vibrant`, `minimal`, `warm`
Voices: `professional`, `friendly`, `energetic`, `calm`, `authoritative`

### Test custom style from JSON file
```bash
echo '{"name":"custom","colors":{"primary":"#FF6600","background":"#1a1a2e"}}' > /tmp/custom-style.json
npx ts-node src/cli.ts "Quick Test" --style /tmp/custom-style.json
```

**Verify:**
- Slides reflect the chosen style's colors and fonts
- Voice matches the selected preset (listen for pitch, speed differences)
- Custom JSON style is merged with defaults

**Cost:** ~$0.14 (same as Layer 0)

---

## Layer 2: AI Image Generation

**Requirements:** `ANTHROPIC_API_KEY` + `OPENAI_API_KEY`

### Setup
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Test
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --images
```

**Verify:**
- Log shows "Generating AI images..." step
- 2-4 images generated (every Nth content slide, skips title/CTA)
- Images are composited onto slides (visible as backgrounds or overlays)
- Slides without images still render correctly

**Cost:** ~$0.14 + $0.04-0.08 per image (3-4 images = ~$0.30 total)

---

## Layer 3: B-Roll Stock Video

**Requirements:** `ANTHROPIC_API_KEY` + `PEXELS_API_KEY`

### Setup
1. Sign up at [pexels.com/api](https://www.pexels.com/api/)
2. Request an API key (instant approval, free)
3. Add to `.env`: `PEXELS_API_KEY=...`

### Test
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --broll
```

**Verify:**
- Log shows "Fetching B-roll clips..." step
- 2-4 clips downloaded and trimmed
- Video contains overlay segments with stock footage at reduced opacity
- Attribution manifest saved in job's tmp directory

**Cost:** ~$0.14 (Pexels is free)

---

## Layer 4: Avatar (HeyGen)

**Requirements:** `ANTHROPIC_API_KEY` + `HEYGEN_API_KEY`

### Setup
1. Sign up at [heygen.com](https://www.heygen.com/)
2. Get an API key from your dashboard
3. Browse available avatars to get an avatar ID
4. Add to `.env`: `HEYGEN_API_KEY=...`

### Test
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --avatar <your-avatar-id>
```

**Verify:**
- Log shows "Generating avatar clips..." step
- Avatar video clips generated with green screen background
- Avatar appears as picture-in-picture overlay in final video
- Lip sync matches the script narration

**Cost:** ~$0.14 + ~$0.50/min of avatar video (~$1.50-2.50 total)

**Note:** HeyGen is the most expensive layer. Start with a short topic to minimize cost.

---

## Layer 5: Music & Sound Effects

**Requirements:** `ANTHROPIC_API_KEY` only (music and SFX are generated locally)

### Test music only
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --music calm
```

### Test SFX only
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --sfx
```

### Test both
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --music calm --sfx
```

### Test with custom music file
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --music-file /path/to/your/music.mp3
```

### Available music moods
`calm`, `corporate`, `energetic`, `epic`, `dramatic`

**Verify:**
- "Mixing audio layers..." step appears in log
- Background music is clearly audible at ~35% volume, ducked under voice narration
- Music fades in at start and fades out at end
- Transition swoosh sounds play between slides (if --sfx)
- Intro sting plays at the beginning (if --sfx)
- Voice remains clearly intelligible over music/SFX

**Cost:** ~$0.14 (all audio generated locally via FFmpeg)

---

## Preview Mode (Zero-Cost Testing)

**Requirements:** FFmpeg only — no API keys, no edge-tts, no internet needed

Preview mode generates a ~10s test video with silent narration (no edge-tts calls),
hardcoded 3-section script, and all visual/audio mixing layers active. Useful for
quickly testing styles, music levels, SFX, and portrait layout without waiting for
TTS or spending API credits.

### Basic preview
```bash
npx ts-node src/cli.ts --preview
```

### Preview with music and SFX
```bash
npx ts-node src/cli.ts --preview --music calm --sfx
```

### Custom duration (scales section lengths proportionally)
```bash
npx ts-node src/cli.ts --preview --music energetic --sfx --duration 5
```

### Portrait preview
```bash
npx ts-node src/cli.ts --preview --portrait --music calm
```

### Preview with custom topic and style
```bash
npx ts-node src/cli.ts --preview "My Topic" --style vibrant --music epic --sfx --duration 8
```

**Verify:**
- No edge-tts or Python calls in output (narration is silent FFmpeg-generated audio)
- Video plays correctly with slides changing at expected intervals
- Background music is clearly audible (not buried under voice)
- SFX transition swooshes and stings play at correct times
- `--duration 5` produces a ~5s video; default is ~10s
- $0.00 cost (unless `--images` is also enabled)

**Cost:** $0.00

---

## SHORT Mode (Shorts / TikTok / Reels)

**Requirements:** `ANTHROPIC_API_KEY` only

### Basic short
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --short
```

### Short with custom music
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --short --music calm
```

### Short regression check (standard mode still works)
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep"
```

**Verify:**
- Output is 1080x1920 (9:16 portrait)
- Script has 8-15 sections, 30-60s total duration
- `fact` and `stat-hero` slide types appear in the script
- Large bold text on slides (96px title, 72px heading)
- Vibrant orange/pink color scheme on near-black background
- No card backgrounds or borders on slides
- First section is a HOOK (not a boring title card)
- Last section is a CTA
- Each narration is ~1 sentence (punchy, not lecture-y)
- Music and SFX enabled by default
- Standard mode (`--short` omitted) still produces normal 16:9 videos

**Cost:** ~$0.14 (same as standard — research + script + metadata)

---

## Tier Presets (Multi-Layer)

### Enhanced (Images + Music)
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --enhanced
```
Enables: AI images + background music + corporate style + professional voice

### Premium (Everything)
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --premium
```
Enables: AI images + B-roll + background music + SFX + corporate style + professional voice
(Avatar requires separate `--avatar <id>` flag)

---

## Combining Layers

All flags can be combined:
```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" \
  --style vibrant \
  --voice friendly \
  --images \
  --broll \
  --music energetic \
  --sfx
```

**Graceful degradation:** If an API key is missing, that layer is silently skipped. The pipeline always completes with whatever layers are available.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Sharp module error | Ensure Node.js >= 18.17. Run `rm -rf node_modules && npm install` |
| Puppeteer timeout | macOS requires `headless: 'shell'` mode (already configured) |
| Rate limit (429) | Wait 30s and retry. Research uses Haiku to reduce token usage |
| JSON parse error | Check `tmp/{jobId}/research-raw.txt` or `script-raw.txt` for LLM output |
| FFmpeg not found | `brew install ffmpeg` (macOS) or install from [ffmpeg.org](https://ffmpeg.org) |
| edge-tts not found | `pip install edge-tts` (requires Python 3) |
| DALL-E errors | Check OPENAI_API_KEY is valid and has credits |
| Pexels 401 | Check PEXELS_API_KEY is valid |
| HeyGen timeout | Avatar generation can take 2-5 min. Check HeyGen dashboard for status |

---

## Cost Summary

| Layer | Per-run Cost | API Keys Needed |
|---|---|---|
| Layer 0 (basic) | ~$0.14 | ANTHROPIC_API_KEY |
| Layer 1 (style/voice) | ~$0.14 | ANTHROPIC_API_KEY |
| Layer 2 (images) | +$0.12-0.32 | + OPENAI_API_KEY |
| Layer 3 (B-roll) | +$0.00 | + PEXELS_API_KEY |
| Layer 4 (avatar) | +$1.50-2.50 | + HEYGEN_API_KEY |
| Layer 5 (music/SFX) | +$0.00 | *(none — local FFmpeg)* |
| **Enhanced tier** | ~$0.30-0.50 | ANTHROPIC + OPENAI |
| **Premium tier** | ~$0.30-0.50 | ANTHROPIC + OPENAI + PEXELS |
| **Premium + avatar** | ~$2.00-3.00 | ANTHROPIC + OPENAI + PEXELS + HEYGEN |
