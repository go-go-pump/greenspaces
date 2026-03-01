# Architecture Overview

## System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLI (cli.ts)                                     │
│  npx ts-node src/cli.ts "topic" [--style] [--voice] [--images] [--music]     │
│  --short  SHORT mode (9:16 portrait, 30-60s, punchy content, fact/stat-hero) │
│  --preview [--duration N]   Quick test (silent audio, no API calls)           │
│  Tier presets: --enhanced (images+music)  --premium (images+broll+music+sfx)  │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Pipeline Orchestrator                                 │
│                           (pipeline.ts)                                       │
│  Runs all steps sequentially, tracks timing & cost, handles retries           │
│  Graceful degradation: skips layers when API keys are missing                 │
│  Preview mode: silent audio, hardcoded script, scalable duration              │
└──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬────────────────────────────────────┘
   │   │   │   │   │   │   │   │   │   │
   ▼   │   │   │   │   │   │   │   │   │
┌─────┐│   │   │   │   │   │   │   │   │   Layer 0: Core Pipeline
│Rsrch││   │   │   │   │   │   │   │   │   ──────────────────────
│     ││   │   │   │   │   │   │   │   │   Always runs.
│Haiku││   │   │   │   │   │   │   │   │   Claude API + web_search
└─────┘│   │   │   │   │   │   │   │   │
       ▼   │   │   │   │   │   │   │   │
  ┌──────┐ │   │   │   │   │   │   │   │
  │Script│ │   │   │   │   │   │   │   │
  │      │ │   │   │   │   │   │   │   │
  │Sonnet│ │   │   │   │   │   │   │   │
  └──────┘ │   │   │   │   │   │   │   │
           ▼   │   │   │   │   │   │   │
     ┌───────┐ │   │   │   │   │   │   │   Layer 1: Configurable
     │Slides │ │   │   │   │   │   │   │   ──────────────────────
     │       │ │   │   │   │   │   │   │   StyleGuide + VoiceProfile
     │Puppet.│ │   │   │   │   │   │   │   5 style presets, 5 voice presets
     └───────┘ │   │   │   │   │   │   │
               ▼   │   │   │   │   │   │
         ┌───────┐ │   │   │   │   │   │   Layer 2: Images (optional)
         │Images │ │   │   │   │   │   │   ──────────────────────────
         │       │ │   │   │   │   │   │   DALL-E 3 + Sharp compositing
         │DALL-E │ │   │   │   │   │   │   Requires OPENAI_API_KEY
         └───────┘ │   │   │   │   │   │
                   ▼   │   │   │   │   │
             ┌───────┐ │   │   │   │   │   Layer 3: B-Roll (optional)
             │B-Roll │ │   │   │   │   │   ─────────────────────────
             │       │ │   │   │   │   │   Pexels free HD stock video
             │Pexels │ │   │   │   │   │   Requires PEXELS_API_KEY
             └───────┘ │   │   │   │   │
                       ▼   │   │   │   │
                 ┌───────┐ │   │   │   │   Layer 4: Avatar (optional)
                 │Avatar │ │   │   │   │   ──────────────────────────
                 │       │ │   │   │   │   HeyGen API + chroma key
                 │HeyGen │ │   │   │   │   Requires HEYGEN_API_KEY
                 └───────┘ │   │   │   │
                           ▼   │   │   │
                     ┌───────┐ │   │   │   Layer 0: Audio (always)
                     │Audio  │ │   │   │   ────────────────────────
                     │       │ │   │   │   edge-tts per section
                     │TTS    │ │   │   │   Configurable voice profile
                     └───────┘ │   │   │
                               ▼   │   │
                         ┌───────┐ │   │   Layer 5: Music+SFX (optional)
                         │Mixer  │ │   │   ────────────────────────────
                         │       │ │   │   Music + SFX + voice mixing
                         │FFmpeg │ │   │   dynaudnorm peak limiting
                         └───────┘ │   │
                                   ▼   │
                             ┌───────┐ │   Video Assembly
                             │Video  │ │   ──────────────
                             │       │ │   Simple (concat) or Layered
                             │FFmpeg │ │   (filter_complex with overlays)
                             └───────┘ │
                                       ▼
                                 ┌──────────┐
                                 │Thumbnail │  Post-processing
                                 │+ Metadata│  ───────────────
                                 │Sharp +   │  Sharp + Claude API
                                 │Claude    │
                                 └──────────┘
```

## Pipeline Flow

```
Input: Topic string + VideoConfig (mode, layers, style, voice)
  │
  ├─ 1. Research ──────── Claude Haiku + web_search → ResearchResult JSON
  │
  ├─ 2. Script Gen ────── Claude Sonnet → Script JSON (standard: 7-12 sections; short: 8-15 sections)
  │
  ├─ 3. Slide Render ──── Inline HTML builders + StyleGuide → Puppeteer → PNG 1920x1080
  │
  ├─ 4. Images ────────── [optional] DALL-E 3 → Sharp composite onto slides
  │
  ├─ 5. B-Roll ────────── [optional] Pexels API → FFmpeg trim → HD clips
  │
  ├─ 6. Avatar ────────── [optional] HeyGen API → green screen → chroma key overlay
  │
  ├─ 7. Audio Gen ─────── edge-tts per section → ffprobe durations → concat MP3
  │
  ├─ 8. Music+SFX Mix ─── [optional] Ambient gen + SFX gen → FFmpeg filter_complex mix
  │
  ├─ 9. Video Assembly ── FFmpeg (concat or layered) → MP4 1920x1080 24fps
  │
  ├─ 10. Thumbnail ────── Sharp (title slide → enhance → 1280x720 JPEG)
  │
  └─ 11. Metadata ─────── Claude Sonnet → title, description, tags, timestamps

Output: ./output/{jobId}/
  ├── video.mp4
  ├── thumbnail.jpg
  ├── metadata.json
  └── pipeline-result.json (timing, cost breakdown)
```

## Integration Points

| Integration | Current Implementation | Future Upgrade Path |
|---|---|---|
| **Research** | Claude Haiku + web_search (3 uses) | YouTube transcripts, forum scraping |
| **Script** | Claude Sonnet | Fine-tuned prompts per content type |
| **Slide Rendering** | Inline HTML + CSS custom properties + Puppeteer | WebGL transitions, animations |
| **Voice / TTS** | edge-tts (free) via Python subprocess | ElevenLabs (set TTS_PROVIDER=elevenlabs) |
| **Image Generation** | OpenAI DALL-E 3 (standard/HD) | Stable Diffusion, Midjourney |
| **Video B-Roll** | Pexels free HD stock video | AI video gen (Runway, Pika) |
| **Avatar** | HeyGen API (green screen + chroma key) | D-ID, Synthesia |
| **Background Music** | Bundled assets (multi-layered FFmpeg, 5 moods) | Freesound.org, Suno API, AI music |
| **Sound Effects** | Bundled assets (sweep, arpeggio, chord) | ElevenLabs SFX, Zapsplat API |
| **Audio Mixing** | FFmpeg filter_complex + dynaudnorm | Professional DAW-style mixing |
| **Video Assembly** | FFmpeg concat + filter_complex overlays | Timeline engine with transitions |
| **Storage** | Local filesystem | S3 / cloud storage |
| **Queue** | Synchronous CLI | Job queue (Bull/Redis) |

## File Structure

```
src/
├── cli.ts              CLI entry point with --style, --voice, --images, --broll,
│                       --avatar, --music, --sfx, --enhanced, --premium,
│                       --short, --preview, --duration flags
├── pipeline.ts         Orchestrator: full pipeline + preview mode (silent audio)
├── config.ts           Environment config (all API keys via dotenv)
├── types.ts            All shared TypeScript interfaces (Layers 0-5, VideoMode, fact/stat-hero)
├── presets/
│   ├── styles.ts       6 style presets (default, corporate, vibrant, minimal, warm, short)
│   ├── voices.ts       5 voice presets (professional, friendly, energetic, calm, authoritative)
│   └── defaults.ts     DEFAULT_VIDEO_CONFIG (all layers disabled by default)
├── services/
│   ├── research.ts     Claude Haiku + web_search → ResearchResult
│   ├── script.ts       Claude Sonnet → Script (narration + slide data)
│   ├── slides.ts       Inline HTML builders + StyleGuide → Puppeteer → PNG
│   ├── images.ts       OpenAI DALL-E 3 → Sharp compositing on slides
│   ├── broll.ts        Pexels API → FFmpeg trim → stock video clips
│   ├── avatar.ts       HeyGen API → green screen → chroma key
│   ├── audio.ts        edge-tts subprocess + VoiceProfile → per-section MP3
│   ├── music.ts        FFmpeg ambient synthesis (full amplitude) / Pixabay / user file
│   ├── sfx.ts          FFmpeg lavfi synthesis (swoosh, intro/outro stings)
│   ├── mixer.ts        Multi-track FFmpeg filter_complex mixing
│   ├── video.ts        FFmpeg assembly (simple concat or layered filter_complex)
│   ├── thumbnail.ts    Sharp image processing
│   └── metadata.ts     Claude Sonnet → YouTube metadata
└── templates/slides/   (legacy — now generated inline by slides.ts)
```

## Feature Tiers

| Tier | CLI Flag | Features | Estimated Cost |
|---|---|---|---|
| **Basic** | *(default)* | Slideshow + default voice + default style | ~$0.14 |
| **SHORT** | `--short` | 9:16 portrait, 30-60s, punchy content, fact/stat-hero slides | ~$0.14 |
| **Enhanced** | `--enhanced` | + custom style + voice + AI images + music | ~$0.50-1.00 |
| **Premium** | `--premium` | + B-roll + avatar + SFX + full mixing | ~$2.00-5.00 |

## Layer Architecture

```
Layer 5: Music & SFX ──── Ambient gen, transition swoosh, stings, multi-track mixer
Layer 4: Avatar ────────── HeyGen API, green screen, chroma key PiP overlay
Layer 3: Video B-Roll ──── Pexels stock video, FFmpeg trim, opacity overlay
Layer 2: Image Gen ─────── DALL-E 3, Sharp compositing (bg/overlay/side)
Layer 1: Core Video ────── Configurable slides (5 styles), voice profiles (5 presets)
Layer 0: POC ───────────── Pipeline (research → script → slides → audio → video → metadata)  ✓
```

## Cost Optimization

| Component | Strategy | Cost |
|---|---|---|
| Research | Claude Haiku (not Sonnet), max 3 web searches | ~$0.02 |
| Script | Claude Sonnet (quality matters for narrative) | ~$0.08 |
| Metadata | Claude Sonnet | ~$0.04 |
| Voice TTS | edge-tts (free Microsoft TTS) | $0.00 |
| Images | DALL-E 3 standard quality by default ($0.04/img) | ~$0.12-0.20 |
| B-Roll | Pexels (free, no API cost) | $0.00 |
| Music | FFmpeg synthesis (free, no API) | $0.00 |
| SFX | FFmpeg synthesis (free, no API) | $0.00 |
| Avatar | HeyGen (~$0.50/min) | ~$1.50-2.50 |
