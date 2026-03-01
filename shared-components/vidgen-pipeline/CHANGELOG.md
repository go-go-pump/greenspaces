# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-02-25 — Layer 5: Music & Sound Effects

### Added
- Background music service with 3 sources: user file, Pixabay API (stub), FFmpeg ambient synthesis
- 5 mood-aware ambient tone generators (calm, corporate, energetic, epic, dramatic)
- SFX engine: transition swoosh, intro sting, outro sting (all FFmpeg-synthesized)
- SFX timeline builder placing effects at slide transitions
- Multi-track audio mixer with FFmpeg filter_complex
- Volume ducking (music at configurable volume under voice)
- Music fade in/out with configurable durations
- Peak limiting via dynaudnorm
- CLI flags: `--music [mood]`, `--music-file <path>`, `--sfx`
- `MusicConfig` and `SFXConfig` types with full defaults

### Technical Notes
- FFmpeg lavfi synthesis used for all generated audio (no external dependencies)
- Pre-computed asetrate values for frequency sweeps (shell doesn't evaluate math expressions)
- Mixer builds dynamic filter_complex chains based on active audio layers

## [0.4.0] - 2026-02-25 — Layer 4: Avatar Integration

### Added
- HeyGen API integration for AI avatar video generation
- Avatar selection by ID with configurable position and size
- Green screen background + chroma key compositing
- Avatar picture-in-picture overlay on video
- Avatar-only mode (replaces slides)
- CLI flag: `--avatar <id>`
- `AvatarConfig` type with position, size, and compositing options

## [0.3.0] - 2026-02-25 — Layer 3: B-Roll Stock Video

### Added
- Pexels API integration for free HD stock video
- Script-to-search-query builder for relevant clip discovery
- FFmpeg video trimming to configurable clip duration
- B-roll overlay compositing in video assembly (opacity-controlled)
- Attribution manifest saved per job
- CLI flag: `--broll`
- `BRollConfig` type with frequency, duration, and placement options

## [0.2.5] - 2026-02-25 — Layer 2: AI Image Generation

### Added
- OpenAI DALL-E 3 integration for AI image generation
- Script-to-image-prompt builder with context extraction
- Smart section selection (every Nth content slide, skips title/CTA)
- Sharp compositing with 3 placement modes: background, overlay, side-by-side
- Cost tracking per image (standard: $0.04, HD: $0.08)
- CLI flags: `--images`
- `ImageConfig` type with quality, frequency, and placement options

### Changed
- Video assembly refactored to support both simple (concat) and layered (filter_complex) modes
- Pipeline orchestrator updated with full VideoConfig support and graceful layer degradation

## [0.2.0] - 2026-02-25 — Layer 1: Core Video (MVP)

### Added
- `StyleGuide` schema with configurable colors, fonts, spacing, transitions
- Theme presets: `default`, `corporate`, `vibrant`, `minimal`, `warm`
- `VoiceProfile` schema with personality, accent, speed, tone mapping
- Voice presets: `professional`, `friendly`, `energetic`, `calm`, `authoritative`
- `BasicVideoConfig` combining style + voice configuration
- CLI flags: `--style <preset|path>`, `--voice <preset>`, `--config <path>`
- Dynamic CSS injection into all slide templates from style guide
- Voice personality → edge-tts voice ID mapping

### Changed
- Slide templates now accept dynamic styles instead of hardcoded colors
- Audio service uses voice profile for voice selection and rate
- Pipeline accepts optional `BasicVideoConfig` parameter

## [0.1.0] - 2026-02-25 — Layer 0: Proof of Concept

### Added
- End-to-end pipeline: topic → research → script → slides → audio → video
- 7 slide templates: title, stats, list, comparison, process, warning, cta
- Claude API integration for research (web_search), script generation, metadata
- edge-tts integration for free TTS narration
- FFmpeg video assembly with slide-audio synchronization
- Sharp thumbnail generation (1280x720)
- YouTube-ready metadata generation (title, description, tags, timestamps)
- CLI entry point: `npx ts-node src/cli.ts "topic"`
- Rate limit retry logic with exponential backoff
- Robust JSON parsing for LLM output (trailing comma fix, fallback extraction)

### Technical Notes
- Puppeteer requires `headless: 'shell'` mode on macOS (Chrome for Testing compatibility)
- Research uses `claude-haiku-4-5` to stay within rate limits (web_search is token-heavy)
- Script/metadata use `claude-sonnet-4` for higher quality output
