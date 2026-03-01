# vidpub — Interface Contract

> **Status:** AVAILABLE
> **Type:** Shared Component
> **Source Origin:** Video Platform (extracted)

---

## What It Does

Publishes videos to YouTube with full metadata. Primary method is the YouTube Data API v3 (OAuth2 resumable upload). When API quota is exhausted, automatically falls back to a Puppeteer-based browser upload through YouTube Studio.

## Interface

### Input

```javascript
{
  videoPath: string,            // Required — path to MP4 file
  title: string,                // Required — video title (max 100 chars)
  description: string,          // Required — video description
  tags: string[],               // Optional — array of tag strings
  thumbnailPath: string,        // Optional — path to thumbnail image (JPEG/PNG)
  categoryId: number,           // Optional — YouTube category ID (default: 22)
  language: string,             // Optional — language code (default: 'en')
  privacy: string,              // Optional — 'public' | 'unlisted' | 'private' (default: 'public')
  scheduleAt: string,           // Optional — ISO 8601 datetime for scheduled publish
  playlistId: string,           // Optional — playlist ID to add video to
  notifySubscribers: boolean,   // Optional — notify subscribers (default: true)
  method: string,               // Optional — 'api' | 'puppeteer' (default: 'api')
}
```

### Output

```javascript
{
  videoId: string,              // YouTube video ID (e.g., 'dQw4w9WgXcQ')
  url: string,                  // Full YouTube URL
  channelId: string,            // Channel ID the video was published to
  status: string,               // 'published' | 'scheduled' | 'processing' | 'failed'
  method: string,               // 'api' | 'puppeteer' (which method was actually used)
  publishedAt: string,          // ISO 8601 timestamp (or scheduled time)
  thumbnailUrl: string,         // YouTube-hosted thumbnail URL (if available)
  quotaUsed: number,            // Data API quota units consumed (0 if puppeteer)
  error: string | null,         // Error message if status = 'failed'
}
```

## Dependencies

### System

- Node.js ≥ 18
- Chromium (bundled with Puppeteer — required for fallback method)

### npm

- `googleapis` — YouTube Data API v3 client
- `puppeteer` — browser automation for fallback uploads

### API Keys / Credentials (via .env)

| Key | Required | Used For |
|-----|----------|----------|
| `YOUTUBE_CLIENT_ID` | **Yes** (for API method) | OAuth2 app client ID |
| `YOUTUBE_CLIENT_SECRET` | **Yes** (for API method) | OAuth2 app client secret |
| `YOUTUBE_REFRESH_TOKEN` | **Yes** (for API method) | OAuth2 refresh token for channel access |
| `GOOGLE_EMAIL` | No (for Puppeteer fallback) | Google account email |
| `GOOGLE_PASSWORD` | No (for Puppeteer fallback) | Google account password |

## Integration Guide for Consuming Projects

### 1. Reference as Local Dependency

```json
// consuming project's package.json
{
  "dependencies": {
    "vidpub": "file:../greenspaces/shared-components/vidpub"
  }
}
```

Or symlink:
```bash
ln -s ~/Documents/projects/greenspaces/shared-components/vidpub ./lib/vidpub
```

### 2. Programmatic Usage

```javascript
import { publish } from 'vidpub/src/publish.mjs';

const result = await publish({
  videoPath: './output/abc123/video.mp4',
  title: '5 Science-Backed Tips for Better Sleep',
  description: 'In this video, we explore...',
  tags: ['sleep', 'health', 'wellness', 'science'],
  thumbnailPath: './output/abc123/thumbnail.jpg',
  privacy: 'public',
});

console.log(result.url);     // https://youtube.com/watch?v=...
console.log(result.videoId); // dQw4w9WgXcQ
console.log(result.method);  // 'api' or 'puppeteer'
```

### 3. CLI Usage

```bash
node ./lib/vidpub/src/cli.mjs ./video.mp4 --title "My Video" --description "Description" --tags "tag1,tag2"
```

### 4. Integration with vidgen-pipeline

```javascript
import { runPipeline } from 'vidgen-pipeline/src/pipeline.js';
import { publish } from 'vidpub/src/publish.mjs';

// Generate the video
const gen = await runPipeline({ topic: 'Better Sleep Tips', style: 'vibrant' });

// Publish to YouTube
const pub = await publish({
  videoPath: `${gen.outputDir}/video.mp4`,
  title: gen.metadata.title,
  description: gen.metadata.description,
  tags: gen.metadata.tags,
  thumbnailPath: `${gen.outputDir}/thumbnail.jpg`,
});
```

### 5. Persistence Requirements

Consuming projects that track publish jobs need a `vidpub_jobs` table:

```sql
CREATE TABLE IF NOT EXISTS vidpub_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,                    -- FK to consuming project's domain
  video_path TEXT NOT NULL,               -- local path to source video
  youtube_video_id TEXT,                  -- YouTube video ID after publish
  youtube_url TEXT,                       -- full YouTube URL
  channel_id TEXT,                        -- YouTube channel ID
  title TEXT NOT NULL,
  description TEXT,
  tags_json TEXT,                         -- serialized tag array
  privacy TEXT DEFAULT 'public',          -- public | unlisted | private
  scheduled_at TEXT,                      -- ISO 8601 scheduled publish time
  status TEXT DEFAULT 'pending',          -- pending | uploading | published | scheduled | failed
  method TEXT,                            -- api | puppeteer
  quota_used INTEGER DEFAULT 0,          -- Data API quota units consumed
  thumbnail_url TEXT,                     -- YouTube-hosted thumbnail URL
  error_message TEXT,                     -- if status = failed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

This schema is **owned by the consuming project**, not by vidpub. Vidpub is stateless — it publishes and returns results. The consumer persists them.

## Metrics

When integrated with `metric-beacon`, emit:

```
vidpub_uploads_total{status="published",method="api"} 1
vidpub_uploads_total{status="published",method="puppeteer"} 1
vidpub_uploads_total{status="failed"} 1
vidpub_upload_duration_seconds{method="api"} 45.2
vidpub_upload_duration_seconds{method="puppeteer"} 180.5
vidpub_quota_remaining 8400
```

---

## Consuming Projects

| Project | How It Uses vidpub |
|---------|-------------------|
| Video Platform | Campaign-driven video publishing to YouTube |
| YOMO | Experience listing video uploads |
