# vid-campaign

Video campaign lifecycle manager — orchestrates the full journey from keyword research through video production, YouTube publishing, and performance monitoring.

**Input:** Campaign definition (topic/keyword, target metrics, schedule)

**Output:** Campaign record with status, produced videos, publish results, and performance metrics

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env
# Edit .env — see INTERFACE.md for required keys

# 3. Create a campaign
node src/cli.mjs create \
  --topic "Best Sleep Supplements 2026" \
  --keyword "sleep supplements" \
  --videos 5 \
  --schedule weekly

# 4. Run next step in campaign
node src/cli.mjs advance --campaign-id abc123

# 5. Check campaign status
node src/cli.mjs status --campaign-id abc123

# 6. Run full campaign (research → produce → publish → monitor)
node src/cli.mjs run \
  --topic "Sleep Supplements" \
  --videos 3 \
  --auto-publish
```

## Campaign Lifecycle

```
CREATE ──→ RESEARCH ──→ PRODUCE ──→ PUBLISH ──→ MONITOR ──→ COMPLETE
  │           │            │           │           │            │
  │           │            │           │           │            │
  Define      Keyword      Generate    Upload to   Track        Evaluate
  topic,      research,    videos      YouTube     views,       ROI,
  targets,    competitor   via         via         watch time,  decide
  schedule    analysis     vidgen      vidpub      engagement   next steps
```

### Phases

| Phase | Action | Component Used | Output |
|-------|--------|---------------|--------|
| **CREATE** | Define campaign parameters | vid-campaign | Campaign record |
| **RESEARCH** | Keyword volume, competition, trending analysis | vid-campaign (internal) | Research report |
| **PRODUCE** | Generate videos from topics | vidgen-pipeline | MP4 + metadata |
| **PUBLISH** | Upload to YouTube with metadata | vidpub | YouTube video IDs |
| **MONITOR** | Track performance metrics | vid-campaign + metric-beacon | Performance data |
| **COMPLETE** | Evaluate campaign ROI | vid-campaign | Final report |

## CLI Commands

```
Commands:
  create     Create a new campaign
  run        Run a full campaign end-to-end
  advance    Advance campaign to next phase
  status     Show campaign status and metrics
  list       List all campaigns
  report     Generate campaign performance report

Create options:
  --topic <text>           Campaign topic/theme
  --keyword <text>         Target keyword for research
  --videos <count>         Number of videos to produce (default: 3)
  --schedule <interval>    Publishing schedule: daily | weekly | biweekly (default: weekly)
  --auto-publish           Automatically publish after production
  --style <preset>         vidgen style preset (default, corporate, vibrant, minimal, warm)
  --voice <preset>         vidgen voice preset (professional, friendly, energetic, calm, authoritative)

Run options:
  --topic <text>           Campaign topic
  --videos <count>         Number of videos
  --auto-publish           Publish without manual review
  --dry-run                Simulate without actually producing/publishing
```

## Cost

| Phase | Component | Cost |
|-------|-----------|------|
| Research | vid-campaign (internal) | ~$0.02 (Claude Haiku) |
| Produce | vidgen-pipeline | ~$0.14–$2.50/video (depending on tier) |
| Publish | vidpub | Free (within API quota) |
| Monitor | vid-campaign | Free |

## Docs

- [Interface Contract](./INTERFACE.md) — input/output contract, dependencies, integration guide
