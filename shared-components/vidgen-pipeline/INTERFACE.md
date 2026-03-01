# vidgen-pipeline — Interface Contract

> **Status:** AVAILABLE
> **Type:** Shared Component
> **Source Origin:** vidgen (standalone project, now onboarded)

---

## What It Does

Automated video generation pipeline. Takes a topic string and produces an MP4 slideshow video with AI narration, images, B-roll, music, sound effects, and YouTube-ready metadata.

## Interface

### Input

```typescript
{
  topic: string;              // Required — the video topic/title
  style?: string;             // Style preset: default | corporate | vibrant | minimal | warm
  voice?: string;             // Voice preset: professional | friendly | energetic | calm | authoritative
  images?: boolean;           // Enable AI image generation (requires OPENAI_API_KEY)
  broll?: boolean;            // Enable stock B-roll (requires PEXELS_API_KEY)
  avatar?: string;            // HeyGen avatar ID (requires HEYGEN_API_KEY)
  music?: string;             // Music mood: calm | energetic | corporate | epic | dramatic
  musicFile?: string;         // Path to local music file (overrides mood)
  sfx?: boolean;              // Enable sound effects
}
```

### Output

```
./output/{jobId}/
├── video.mp4                 // Narrated slideshow (3-4 min)
├── thumbnail.jpg             // 1280×720 YouTube thumbnail
├── metadata.json             // { title, description, tags, timestamps }
└── pipeline-result.json      // Timing and cost breakdown
```

### Tier Presets

| Tier | Layers Enabled |
|------|---------------|
| Basic (default) | Narration + slides |
| Enhanced (`--enhanced`) | + AI images + background music |
| Premium (`--premium`) | + B-roll + sound effects |

## Dependencies

### System

- Node.js ≥ 18
- Python 3 (for `edge-tts`)
- ffmpeg (`brew install ffmpeg` on macOS)
- `pip3 install edge-tts`

### npm

- `@anthropic-ai/sdk` — script generation, research
- `sharp` — image processing
- `fluent-ffmpeg` — video assembly
- `puppeteer` — slide rendering (HTML → PNG)

### API Keys (via .env)

| Key | Required | Used For |
|-----|----------|----------|
| `ANTHROPIC_API_KEY` | **Yes** | Script generation, research |
| `OPENAI_API_KEY` | No | AI image generation (DALL-E) |
| `PEXELS_API_KEY` | No | Stock B-roll video |
| `HEYGEN_API_KEY` | No | Avatar video generation |

## Integration Guide for Consuming Projects

### 1. Reference as Local Dependency

```json
// consuming project's package.json
{
  "dependencies": {
    "vidgen-pipeline": "file:../greenspaces/shared-components/vidgen-pipeline"
  }
}
```

Or symlink:
```bash
ln -s ~/Documents/projects/greenspaces/shared-components/vidgen-pipeline ./lib/vidgen
```

### 2. Programmatic Usage

```typescript
import { runPipeline } from 'vidgen-pipeline/src/pipeline';

const result = await runPipeline({
  topic: "4-Year-Old's Mickey Mouse Birthday Party",
  style: 'vibrant',
  voice: 'friendly',
  images: true,
  music: 'energetic'
});

// result.outputDir → path to generated files
// result.metadata → { title, description, tags }
```

### 3. CLI Usage

```bash
npx ts-node ./lib/vidgen/src/cli.ts "Your Topic" --enhanced
```

### 4. Persistence Requirements

Consuming projects that track video generation jobs need a `vidgen_jobs` table:

```sql
CREATE TABLE IF NOT EXISTS vidgen_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,                    -- FK to consuming project's domain
  topic TEXT NOT NULL,
  config_json TEXT,                        -- serialized input config
  status TEXT DEFAULT 'pending',           -- pending | generating | ready | failed
  output_dir TEXT,                         -- path to output/{jobId}
  video_path TEXT,                         -- path to final video.mp4
  thumbnail_path TEXT,                     -- path to thumbnail.jpg
  metadata_json TEXT,                      -- title, description, tags from pipeline
  duration_seconds REAL,                   -- video duration
  cost_json TEXT,                          -- API cost breakdown from pipeline-result
  error_message TEXT,                      -- if status = failed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

This schema is **owned by the consuming project**, not by vidgen-pipeline. Vidgen is stateless — it generates and returns results. The consumer persists them.

### 5. Output Storage

Vidgen writes to `./output/{jobId}/` relative to its own directory. Consuming projects should either:
- Configure an output directory via env var or config
- Move/copy outputs to their own storage after generation
- Symlink vidgen's output dir to their preferred location

## Metrics

When integrated with `metric-beacon`, emit:

```
vidgen_jobs_total{status="completed"} 1
vidgen_jobs_total{status="failed"} 1
vidgen_job_duration_seconds{topic="..."} 180.5
vidgen_job_cost_usd{topic="..."} 0.12
```

---

## Consuming Projects

| Project | How It Uses vidgen-pipeline |
|---------|---------------------------|
| Video Platform | Campaign-driven video generation + YouTube publish |
| YOMO | Experience listing video creation |
