# vidpub

YouTube video publishing service — uploads videos with metadata via the YouTube Data API v3, with a Puppeteer-based fallback when API quota is exhausted.

**Input:** Video file path + metadata (title, description, tags, thumbnail) + publish config

**Output:** YouTube video ID + publish status + channel URL

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure credentials
cp .env.example .env
# Edit .env:
#   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN (for Data API v3)
#   GOOGLE_EMAIL, GOOGLE_PASSWORD (for Puppeteer fallback — optional)

# 3. Publish a video
node src/cli.mjs ./video.mp4 \
  --title "5 Tips for Better Sleep" \
  --description "Science-backed tips..." \
  --tags "sleep,health,wellness" \
  --thumbnail ./thumbnail.jpg

# 4. Schedule for later
node src/cli.mjs ./video.mp4 \
  --title "5 Tips for Better Sleep" \
  --schedule "2026-03-15T14:00:00Z"

# 5. Force Puppeteer fallback (bypasses Data API)
node src/cli.mjs ./video.mp4 \
  --title "5 Tips for Better Sleep" \
  --method puppeteer
```

## CLI Options

```
Required:
  <video-path>               Path to the video file (MP4)

Metadata:
  --title <text>             Video title (max 100 chars)
  --description <text>       Video description
  --tags <csv>               Comma-separated tags
  --thumbnail <path>         Custom thumbnail image (JPEG/PNG, max 2MB)
  --category <id>            YouTube category ID (default: 22 = People & Blogs)
  --language <code>          Video language (default: en)

Publishing:
  --privacy <level>          public | unlisted | private (default: public)
  --schedule <iso-datetime>  Schedule publish time (ISO 8601)
  --playlist <id>            Add to playlist after upload
  --notify                   Notify subscribers (default: true)

Method:
  --method <api|puppeteer>   Upload method (default: api, falls back to puppeteer)
```

## Upload Methods

### YouTube Data API v3 (Primary)

Uses OAuth2 with a refresh token for resumable uploads. Handles:
- Resumable upload protocol (for large files)
- Metadata injection (title, description, tags, category)
- Thumbnail upload via separate API call
- Playlist insertion
- Scheduled publishing (via `publishAt` field)

**Quota:** 10,000 units/day. A video upload costs 1,600 units. ~6 uploads/day per API key.

### Puppeteer Fallback

When Data API quota is exhausted (HTTP 403), automatically falls back to browser-based upload:
- Launches headless Chromium
- Navigates to YouTube Studio upload page
- Fills in metadata fields via DOM manipulation
- Handles the multi-step upload wizard
- Waits for processing confirmation

**No quota limits** but slower and more fragile (depends on YouTube Studio DOM structure).

## Cost

| Method | Cost | Limits |
|--------|------|--------|
| Data API v3 | Free (within quota) | ~6 uploads/day per API key |
| Puppeteer | Free | No hard limit, ~2-3 min per upload |

## Docs

- [Interface Contract](./INTERFACE.md) — input/output contract, dependencies, integration guide
