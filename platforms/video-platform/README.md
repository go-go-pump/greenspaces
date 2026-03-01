# Video Platform — Reference Platform

> **Type:** Platform (reference architecture)
> **Domain:** YouTube video content creation and publishing
> **Status:** AVAILABLE — all core components extracted

---

## Overview

The Video Platform is a curated assembly of Greenspaces shared components that together deliver end-to-end YouTube video content: from keyword research through automated video production, publishing, and performance monitoring.

This document is the **reference architecture**. Each business creates its own platform instance by wiring these components with its domain logic.

---

## Core Components

| Component | Status | Role in Platform |
|-----------|--------|-----------------|
| [`vidgen-pipeline`](../../shared-components/vidgen-pipeline/) | AVAILABLE | Video production (topic → MP4 + metadata + thumbnail) |
| [`vidpub`](../../shared-components/vidpub/) | AVAILABLE | YouTube publishing (Data API v3 + Puppeteer fallback) |
| [`vid-campaign`](../../shared-components/vid-campaign/) | AVAILABLE | Campaign lifecycle orchestration (research → produce → publish → monitor) |

### Supporting Components

| Component | Status | Role |
|-----------|--------|------|
| `metric-beacon` | CANDIDATE | Performance metric emission for monitoring |
| `browser-watcher` | CANDIDATE | Shared Puppeteer utility (used by vidpub fallback) |
| `llm-tagger` | CANDIDATE | Content classification for topic analysis |

---

## End-to-End Workflow

```
                          vid-campaign (orchestrator)
                    ┌────────────┼────────────────┐
                    │            │                 │
              ┌─────▼─────┐ ┌───▼───┐ ┌──────────▼──────────┐
              │ RESEARCH   │ │PRODUCE│ │     PUBLISH          │
              │            │ │       │ │                      │
              │ Claude     │ │vidgen-│ │ vidpub               │
              │ Haiku +    │ │pipe-  │ │ ├─ YouTube Data API  │
              │ web search │ │line   │ │ └─ Puppeteer fallback│
              └────────────┘ └───────┘ └──────────────────────┘
                                                │
                                        ┌───────▼───────┐
                                        │   MONITOR     │
                                        │               │
                                        │ metric-beacon │
                                        │ (performance  │
                                        │  tracking)    │
                                        └───────────────┘
```

### Detailed Flow

1. **Campaign Creation** — Define topic, keyword, video count, schedule
2. **Research** — Claude Haiku + web search analyzes keyword volume, competition, generates topic variations
3. **Production** — For each topic variation, vidgen-pipeline produces:
   - Research → Script → Slides → Audio → Video assembly
   - Optional: AI images, B-roll, avatar, music, SFX, captions
   - Output: MP4 + thumbnail + metadata JSON
4. **Publishing** — vidpub uploads each video to YouTube:
   - Primary: Data API v3 (OAuth2 resumable upload, ~6/day quota)
   - Fallback: Puppeteer browser automation (no quota limit)
   - Sets title, description, tags, thumbnail, category, privacy
5. **Monitoring** — Track views, watch time, engagement, CTR via YouTube Analytics

---

## Platform Instances

### Man vs Health

```
MVH Dashboard
└── Video Campaigns
    ├── vid-campaign (orchestrator)
    ├── vidgen-pipeline (production — style: warm, voice: friendly)
    ├── vidpub (YouTube publish)
    └── Custom: ties video topics to health coaching content calendar
```

Videos are **loosely connected** to coaching topics. Published on a regular schedule. Topic selection driven by coaching program themes.

### YOMO (Experience Listings)

```
YOMO Dashboard
└── Product Videos
    ├── vid-campaign (orchestrator)
    ├── vidgen-pipeline (production — style: vibrant, voice: energetic)
    ├── vidpub (YouTube publish)
    └── Custom: video IS the listing — created alongside product entry
```

Videos are **tightly coupled** to product listings. Every new experience listing triggers a video generation. The video URL is stored as a product field.

### Generic YouTube Channel

```
Channel Dashboard
└── Content Pipeline
    ├── vid-campaign (orchestrator — autoPublish: true)
    ├── vidgen-pipeline (production — premium tier)
    ├── vidpub (YouTube publish)
    └── Custom: keyword-driven topic selection, volume-optimized
```

Pure content play. High-volume production. Topics driven entirely by keyword research. Fully automated publish.

---

## Persistence Schema (For Platform Instances)

A business implementing the Video Platform needs these tables. Each component's schema is documented in its INTERFACE.md. The combined schema:

```sql
-- vid-campaign: Campaign management
CREATE TABLE vid_campaigns ( ... );           -- see vid-campaign/INTERFACE.md
CREATE TABLE vid_campaign_videos ( ... );     -- see vid-campaign/INTERFACE.md

-- vidgen-pipeline: Video generation tracking
CREATE TABLE vidgen_jobs ( ... );             -- see vidgen-pipeline/INTERFACE.md

-- vidpub: Publishing tracking
CREATE TABLE vidpub_jobs ( ... );             -- see vidpub/INTERFACE.md
```

All schemas are **owned by the consuming project** and defined in each component's INTERFACE.md.

---

## Setup Guide

### 1. Install Components

```bash
# In your project root
npm install

# Add Greenspaces components as local dependencies
# package.json:
{
  "dependencies": {
    "vidgen-pipeline": "file:../greenspaces/shared-components/vidgen-pipeline",
    "vidpub": "file:../greenspaces/shared-components/vidpub",
    "vid-campaign": "file:../greenspaces/shared-components/vid-campaign"
  }
}
```

### 2. Configure Environment

```bash
# Required
ANTHROPIC_API_KEY=           # Research + script generation

# Video production (optional, for enhanced/premium tiers)
OPENAI_API_KEY=              # AI images (DALL-E 3)
PEXELS_API_KEY=              # Stock B-roll
HEYGEN_API_KEY=              # Avatar generation

# YouTube publishing
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

### 3. Run a Campaign

```javascript
import { runCampaign } from 'vid-campaign/src/campaign.mjs';

const campaign = await runCampaign({
  topic: 'Sleep Supplements',
  videoCount: 3,
  schedule: 'weekly',
  autoPublish: true,
  vidgenConfig: { style: 'vibrant', voice: 'energetic', images: true },
});
```

---

## Cost Breakdown

| Phase | Per Video | Notes |
|-------|-----------|-------|
| Research | ~$0.02 | Claude Haiku + web search (amortized across campaign) |
| Production (basic) | ~$0.14 | Slides + narration + assembly |
| Production (enhanced) | ~$0.40 | + AI images + background music |
| Production (premium) | ~$2.50 | + B-roll + avatar + SFX + captions |
| Publishing | Free | Within Data API quota (6/day) |
| Monitoring | Free | YouTube Analytics |

**Typical campaign (3 videos, enhanced tier):** ~$1.22 total

---

## Origin

This platform was originally built as a standalone application (`video-platform` repo). During the Greenspaces extraction, its functional components were separated into:
- `vidgen-pipeline` — video production engine (extracted first, STATUS: AVAILABLE)
- `vidpub` — YouTube publishing service (extracted, STATUS: AVAILABLE)
- `vid-campaign` — campaign lifecycle orchestrator (extracted, STATUS: AVAILABLE)

The standalone `video-platform` repo is now superseded by this reference platform. New businesses consume the components directly rather than forking the monolithic platform.
