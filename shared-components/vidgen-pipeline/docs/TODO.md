# VideoGen – Feature Roadmap & Implementation Checklist

**Project Goal:**
Build a layered, configurable AI-powered video generation system that outputs MP4 files with slideshow, voiceover, images, video B-roll, avatar overlay, and dynamic music/SFX layering.

---

# ✅ Milestone Tracking

## 1. Documentation & Milestones

- [x] Update documentation with all milestone events reached
- [x] Add architecture overview diagram
- [x] Document current pipeline flow (Script → Slideshow → Voice → Export)
- [x] Document integration points (Voice, Image Gen, Video Gen, HeyGen, Music/SFX)
- [x] Create versioned changelog
- [x] Define feature tier structure (Basic / Enhanced / Premium)

---

# 🟢 LAYER 1 — Core Video (MVP)

## 2. Slideshow Engine (Configurable)

- [x] Create `StyleGuide` schema
    - [x] Primary / secondary colors
    - [x] Background color
    - [x] Font family / sizes / weights
    - [x] Layout spacing rules
    - [x] Transition type & speed
- [x] Allow style guide JSON input
- [x] Apply style dynamically
- [x] Create default fallback style
- [x] Enable theme presets

---

## 3. Voice Configuration System

- [x] Create `VoiceProfile` schema
    - [x] Personality
    - [x] Archetype
    - [x] Accent
    - [x] Speed
    - [x] Tone
- [x] Map personality → provider voice IDs
- [x] Add preview mode (--preview with silent audio, --duration scaling)
- [x] Implement fallback voice

---

## 4. Default Basic Video Mode

Includes:
- Slideshow
- Script
- Voiceover

- [x] Create `BasicVideoConfig`
- [x] Apply default style
- [x] Apply default voice
- [x] Render MP4 output

---

# 🟡 LAYER 2 — Image Generation

## 5. Image Generation Integration

- [x] Integrate OpenAI Image API
- [x] Secure API key handling
- [x] Create script → image prompt builder
- [x] Store & cache images
- [x] Error handling & retries

---

## 6. Image Placement Logic

- [x] Detect slide transitions
- [x] Configurable image frequency
- [x] Manual vs auto placement
- [x] Fade / zoom animation options
- [x] Image-only slide option

---

# 🟠 LAYER 3 — Video / B-Roll

## 7. AI / Stock Video Segments (3–5 sec)

- [x] Evaluate AI video providers
- [x] Evaluate stock APIs (Pexels / Pixabay)
- [x] Create `VideoSegmentConfig`
- [x] Map script → video prompts
- [x] Insert clips into timeline
- [x] Blend transitions

---

## 8. B-Roll Timeline System

- [x] Create layered renderer
- [x] Priority system (Video > Image > Slide)
- [x] Opacity controls
- [x] Motion pan/zoom (Ken Burns)
- [x] Voice timestamp sync

---

# 🔵 LAYER 4 — Avatar Integration (HeyGen)

## 9. HeyGen Integration

- [x] Integrate HeyGen API
- [x] Avatar selection config
- [x] Lip sync with script
- [x] Handle voice override logic

---

## 10. Avatar Overlay System

- [x] Overlay positioning options
- [x] Transparency support
- [x] Avatar-only mode
- [x] Avatar + B-roll mode

---

# 🟣 LAYER 5 — Music & Sound Effects System

**Goal:** Add music, jingles, transitions, and dynamic sound layering.

---

## 11. Background Music Integration

- [x] Evaluate royalty-free music APIs
    - [x] Stock providers (Pixabay stub)
    - [x] AI-generated music providers (FFmpeg ambient synthesis)
- [x] Create `MusicConfig`
    - [x] Mood (Epic, Calm, Corporate, Energetic, Dramatic)
    - [x] Tempo
    - [x] Genre
    - [x] Intro / Outro music toggle
    - [x] Loop vs one-shot
- [x] Auto-match music to script sentiment
- [x] Add volume ducking under voice
- [x] Fade in/out transitions
- [x] Music duration trimming to match video length

---

## 12. Sound Effects (SFX) Layer

- [x] Create `SFXConfig`
    - [x] Transition sounds
    - [x] Slide change swoosh
    - [ ] Emphasis pop / impact
    - [x] Intro sting
    - [x] Finale sting
- [x] Bundled audio assets (multi-layered FFmpeg compositions, not bare sine waves)
- [x] Allow auto-placement on:
    - [x] Slide transitions
    - [x] Section breaks
    - [ ] Key script moments
- [ ] Manual override support
- [x] Volume normalization
- [x] Audio mixing layer

---

## 13. Audio Mixing Engine

- [x] Multi-track timeline
    - Voice
    - Music
    - SFX
    - Avatar audio
- [x] Implement auto-ducking logic
- [x] Balance normalization
- [x] Peak limiter
- [x] Export unified audio track

---

# 🟣 FINAL PREMIUM STACK

## 14. Full Feature Mode

Includes:
- Slideshow
- Style guide
- Images
- Video B-roll
- Avatar
- Music
- Sound effects

- [x] Create `PremiumVideoConfig` (→ `VideoConfig` with all layers)
- [x] Disable redundant audio layers if avatar voice enabled
- [x] Ensure audio sync integrity
- [x] Add cost-tier logic hooks

---

# ⚙️ Rendering & Output

## 15. Final Output System

- [x] Unified timeline engine
- [x] FFmpeg integration
- [x] 1080p export
- [ ] Optional 4K
- [x] MP4 output
- [ ] Cloud storage upload
- [ ] Asset cleanup
- [x] Cost tracking per generation

---

# 📱 SHORT Mode (Shorts / TikTok / Reels)

- [x] `--short` CLI flag with automatic 9:16, energetic defaults
- [x] SHORT_STYLE preset (bold, large text, vibrant orange/pink, no card backgrounds)
- [x] SHORT_VIDEO_CONFIG defaults (energetic voice, high image frequency, SFX enabled)
- [x] SHORT research prompt (viral hooks, shocking stats, "most people don't know" angles)
- [x] SHORT script prompt (8-15 sections, 1 sentence max, 30-60s total)
- [x] `fact` slide type (full-viewport bold gradient text)
- [x] `stat-hero` slide type (huge gradient number + label)
- [x] Mode-aware validation (skip "use all 7 types" check in short mode)
- [x] Fade transitions between slides (Phase 3)
- [x] Ken Burns zoom on image slides (Phase 3)
- [x] Fullscreen image placement compositing (Phase 3)
- [ ] Auto captions with reserved space

---

# 📊 Future Enhancements

- [ ] Freesound.org API for music (enhanced tier)
- [ ] Suno API for AI-generated music (premium tier)
- [ ] ElevenLabs SFX from text prompt
- [ ] Zapsplat API integration
- [ ] Template marketplace
- [ ] Saved brand kits
- [ ] Multi-language generation
- [ ] Auto captions
- [ ] Social format presets
- [ ] Audio-reactive transitions
- [ ] AI emotion-driven soundtrack changes

---

# 💰 Feature Tier Planning

## Basic
- Slideshow
- Default voice

## Enhanced
- Custom style
- Custom voice
- Images
- Basic music

## Premium
- Full B-roll
- Avatar
- AI video
- Advanced music + SFX layering
- Branded exports

---

# 🚀 Definition of Done

- [x] Fully automated pipeline
- [x] Modular layer architecture
- [x] Prompt-based configuration
- [x] Clean MP4 output
- [x] Error logging & retries
- [x] Scalable integrations
- [x] Cost-aware rendering system

---

**End of Roadmap**
