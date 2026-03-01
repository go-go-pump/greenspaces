# vid-campaign — Interface Contract

> **Status:** AVAILABLE
> **Type:** Shared Component
> **Source Origin:** Video Platform (extracted)

---

## What It Does

Manages the full lifecycle of a video campaign: keyword research, video production (via vidgen-pipeline), YouTube publishing (via vidpub), and performance monitoring. Orchestrates the components — it doesn't generate or upload itself.

## Interface

### Input (Campaign Creation)

```javascript
{
  topic: string,                // Required — campaign topic/theme
  keyword: string,              // Optional — target keyword for YouTube SEO research
  videoCount: number,           // Optional — number of videos to produce (default: 3)
  schedule: string,             // Optional — 'daily' | 'weekly' | 'biweekly' (default: 'weekly')
  autoPublish: boolean,         // Optional — publish after production without review (default: false)
  vidgenConfig: {               // Optional — passed through to vidgen-pipeline
    style: string,              //   Style preset
    voice: string,              //   Voice preset
    images: boolean,            //   Enable AI images
    broll: boolean,             //   Enable B-roll
    music: string,              //   Music mood
    sfx: boolean,               //   Enable SFX
  },
  vidpubConfig: {               // Optional — passed through to vidpub
    privacy: string,            //   'public' | 'unlisted' | 'private'
    playlistId: string,         //   YouTube playlist ID
    notifySubscribers: boolean, //   Notify subs
  },
}
```

### Output (Campaign Record)

```javascript
{
  campaignId: string,           // Unique campaign identifier
  topic: string,
  status: string,               // 'created' | 'researching' | 'producing' | 'publishing' | 'monitoring' | 'complete' | 'failed'
  phase: string,                // Current lifecycle phase
  research: {
    keyword: string,
    volume: number,             // Monthly search volume estimate
    competition: string,        // 'low' | 'medium' | 'high'
    topicVariations: string[],  // Related topics for individual videos
    completedAt: string,
  },
  videos: [{
    index: number,
    topic: string,              // Specific video topic (from research variations)
    vidgenJobId: string,        // vidgen-pipeline job ID
    videoPath: string,          // Local path to produced video
    status: string,             // 'pending' | 'produced' | 'published' | 'failed'
    youtubeVideoId: string,     // Set after publish
    youtubeUrl: string,         // Set after publish
    metrics: {                  // Set during monitoring
      views: number,
      watchTimeHours: number,
      likes: number,
      comments: number,
      ctr: number,              // Click-through rate
      avgViewDuration: number,  // Seconds
    },
  }],
  schedule: {
    interval: string,
    nextPublishAt: string,      // ISO 8601
  },
  totals: {
    videosProduced: number,
    videosPublished: number,
    totalViews: number,
    totalWatchTimeHours: number,
    totalCostUsd: number,
  },
  createdAt: string,
  updatedAt: string,
}
```

## Dependencies

### System

- Node.js ≥ 18

### npm

- `@anthropic-ai/sdk` — keyword research (Claude Haiku + web search)

### Greenspaces Components

| Component | Required | Used For |
|-----------|----------|----------|
| `vidgen-pipeline` | **Yes** | Video production (topic → MP4) |
| `vidpub` | No (manual publish if absent) | YouTube publishing |
| `metric-beacon` | No | Performance metric emission |

### API Keys (via .env)

| Key | Required | Used For |
|-----|----------|----------|
| `ANTHROPIC_API_KEY` | **Yes** | Keyword research via Claude Haiku |

All other API keys are passed through to vidgen-pipeline and vidpub — see their INTERFACE.md docs.

## Integration Guide for Consuming Projects

### 1. Reference as Local Dependency

```json
// consuming project's package.json
{
  "dependencies": {
    "vid-campaign": "file:../greenspaces/shared-components/vid-campaign",
    "vidgen-pipeline": "file:../greenspaces/shared-components/vidgen-pipeline",
    "vidpub": "file:../greenspaces/shared-components/vidpub"
  }
}
```

Or symlink:
```bash
ln -s ~/Documents/projects/greenspaces/shared-components/vid-campaign ./lib/vid-campaign
```

### 2. Programmatic Usage

```javascript
import { createCampaign, advanceCampaign, getCampaignStatus } from 'vid-campaign/src/campaign.mjs';

// Create a campaign
const campaign = await createCampaign({
  topic: 'Best Sleep Supplements 2026',
  keyword: 'sleep supplements',
  videoCount: 5,
  schedule: 'weekly',
  autoPublish: true,
  vidgenConfig: { style: 'vibrant', voice: 'energetic', images: true },
});

// Advance through phases one at a time
await advanceCampaign(campaign.campaignId); // RESEARCH
await advanceCampaign(campaign.campaignId); // PRODUCE
await advanceCampaign(campaign.campaignId); // PUBLISH
await advanceCampaign(campaign.campaignId); // MONITOR

// Or run the full lifecycle
import { runCampaign } from 'vid-campaign/src/campaign.mjs';
const result = await runCampaign({
  topic: 'Sleep Tips',
  videoCount: 3,
  autoPublish: true,
});
```

### 3. CLI Usage

```bash
node ./lib/vid-campaign/src/cli.mjs create --topic "Sleep Tips" --videos 3
node ./lib/vid-campaign/src/cli.mjs advance --campaign-id abc123
node ./lib/vid-campaign/src/cli.mjs status --campaign-id abc123
```

### 4. Persistence Requirements

Consuming projects that track campaigns need a `vid_campaigns` table:

```sql
CREATE TABLE IF NOT EXISTS vid_campaigns (
  id TEXT PRIMARY KEY,                     -- UUID campaign ID
  topic TEXT NOT NULL,
  keyword TEXT,
  status TEXT DEFAULT 'created',           -- created | researching | producing | publishing | monitoring | complete | failed
  phase TEXT DEFAULT 'create',             -- current lifecycle phase
  video_count INTEGER DEFAULT 3,
  schedule_interval TEXT DEFAULT 'weekly',  -- daily | weekly | biweekly
  auto_publish INTEGER DEFAULT 0,          -- boolean
  vidgen_config_json TEXT,                 -- serialized vidgen config
  vidpub_config_json TEXT,                 -- serialized vidpub config
  research_json TEXT,                      -- serialized research results
  totals_json TEXT,                        -- serialized campaign totals
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vid_campaign_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,               -- FK to vid_campaigns
  video_index INTEGER NOT NULL,
  topic TEXT NOT NULL,
  vidgen_job_id TEXT,
  video_path TEXT,
  thumbnail_path TEXT,
  metadata_json TEXT,
  status TEXT DEFAULT 'pending',           -- pending | produced | published | failed
  youtube_video_id TEXT,
  youtube_url TEXT,
  metrics_json TEXT,                       -- serialized performance metrics
  cost_usd REAL DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (campaign_id) REFERENCES vid_campaigns(id)
);
```

This schema is **owned by the consuming project**, not by vid-campaign. The component is stateless — it orchestrates and returns results. The consumer persists them.

### 5. State Machine

```
                    ┌──────────────────────────────────────┐
                    ▼                                      │
CREATE ──→ RESEARCHING ──→ PRODUCING ──→ PUBLISHING ──→ MONITORING ──→ COMPLETE
  │            │              │             │              │
  └─ FAILED ◄─┴── FAILED ◄──┴── FAILED ◄──┴── FAILED ◄──┘
```

Each transition is triggered by `advanceCampaign()` or automatically by `runCampaign()`.

## Metrics

When integrated with `metric-beacon`, emit:

```
vid_campaigns_total{status="complete"} 1
vid_campaigns_total{status="failed"} 1
vid_campaign_videos_total{status="published"} 5
vid_campaign_duration_hours{campaign_id="abc123"} 72.5
vid_campaign_total_views{campaign_id="abc123"} 12500
vid_campaign_total_cost_usd{campaign_id="abc123"} 1.85
```

---

## Consuming Projects

| Project | How It Uses vid-campaign |
|---------|------------------------|
| Video Platform | Full campaign lifecycle for YouTube channels |
| YOMO | Experience listing video campaigns |
