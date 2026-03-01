# Environment Setup

## Prerequisites

### Node.js

Node.js v16+ works but v20 LTS is recommended.

```bash
node --version  # should show v16+ (v20+ recommended)
```

### FFmpeg

Required for audio concatenation and video assembly.

```bash
# macOS
brew install ffmpeg

# Verify
ffmpeg -version
ffprobe -version
```

### Python 3 + edge-tts

Free Microsoft Edge TTS used for narration audio in the full pipeline.
Not required for `--preview` mode (which generates silent audio via FFmpeg).

```bash
pip3 install edge-tts

# Verify
python3 -m edge_tts --list-voices | head -5
```

### Chrome/Chromium

Puppeteer downloads its own Chromium, or uses system Chrome. No extra setup needed.

### API Key

You need an Anthropic API key for Claude (research, script generation, metadata).

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## Install

```bash
cd /path/to/vidgen
npm install
```

## Verify Setup

```bash
# Check TypeScript compiles
npx tsc --noEmit

# Check edge-tts works
python3 -m edge_tts --text "Hello world" --voice en-US-GuyNeural --write-media /tmp/test.mp3

# Check FFmpeg works
ffprobe -v quiet -print_format json -show_format /tmp/test.mp3
```

## TTS Voice Options

List available voices:

```bash
python3 -m edge_tts --list-voices
```

Popular English voices:
- `en-US-GuyNeural` (default, male)
- `en-US-JennyNeural` (female)
- `en-US-AriaNeural` (female)
- `en-GB-RyanNeural` (British male)

Set in `.env`:
```
EDGE_TTS_VOICE=en-US-JennyNeural
```

## SHORT Mode

SHORT mode (`--short`) produces fast-paced 30-60s portrait videos optimized for TikTok/Shorts/Reels. No additional setup required — it uses the same prerequisites as standard mode.

```bash
npx ts-node src/cli.ts "5 Tips for Better Sleep" --short
```

## Bundled Audio Assets

Music and SFX use pre-generated bundled assets for better audio quality. To regenerate them:

```bash
npx ts-node scripts/generate-assets.ts
```

The bundled assets are stored in `assets/music/` and `assets/sfx/`. If they're missing, the system falls back to real-time lavfi synthesis automatically.

## Upgrading to ElevenLabs TTS

When ready for higher-quality voices:

1. Get an API key from [ElevenLabs](https://elevenlabs.io)
2. Add to `.env`:
   ```
   TTS_PROVIDER=elevenlabs
   ELEVENLABS_API_KEY=your-key-here
   ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
   ```
3. The audio service will automatically use ElevenLabs instead of edge-tts
