# Greenspaces — Full Services Catalog

**Last Updated:** February 28, 2026

---

## What Is a Service?

A service is an orchestrated collection of shared components that delivers a complete business capability. Services are consumed by business dashboards — not as standalone platforms.

### The Key Insight

We built video-platform, social-dm-platform, and mass-email-platform as standalone platforms. That was shortsighted. They should be **services consumed by a business's own dashboard**. Here's why:

- Each business has unique needs for how these capabilities connect
- A video in Man vs Health has a loose connection to a product listing. A video in a store IS the product listing.
- Data (5M email contacts) should be shared across projects from a common home
- Onboarding a business into these capabilities should happen from the business's dashboard, not by navigating to 3 separate platforms

### Services vs Platforms

| Before (Platform Thinking) | After (Service Thinking) |
|---------------------------|-------------------------|
| `video-platform` (standalone app) | `vid-campaign` + `vidgen-pipeline` + `vidpub` + `vid-research` → consumed by business dashboard |
| `social-dm-platform` (standalone app) | `fb-auth` + `fb-scraper` + `dm-engine` + `campaign-runner` → consumed by business dashboard |
| `mass-email-platform` (standalone app) | `email-campaign-core` + `contact-store` + `email-send` + `reputation-tracker` → consumed by business dashboard |

---

## Service Suites

### 1. Marketing Platform Suite

The aggregate of services that help a business create content, distribute it, engage audiences, and measure results.

| Service | Description | Components Used | Current State |
|---------|-------------|-----------------|---------------|
| `vidgen` | Automated video generation (topic → researched, scripted, produced MP4) | `vidgen-pipeline` | Active UAT |
| `vidpub` | Video publishing to YouTube (upload, metadata, scheduling) | `vidpub`, `browser-watcher` | Spec exists in video-platform |
| `vid-campaign` | Start a video campaign, monitor results, evaluate at end | `vid-campaign`, `metric-beacon` | Spec exists in video-platform |
| `vid-research` | YouTube keyword research (volume, competition, CPC, difficulty) | Standalone | Spec exists in video-platform |
| `social-engage` | Facebook group posting, commenting, DM outreach | `fb-auth`, `fb-graphql-scraper`, `browser-watcher` | Spec exists in social-dm-platform |
| `cold-email` | Multi-tenant email campaign management | `email-campaign-core`, `contact-store`, `email-send` | Spec exists in mass-email-platform |
| `content-enrich` | LLM-powered content tagging and classification | `llm-tagger`, `guardrail-filter` | Working in Good Vibes |

**Shared Data Layer:** The 5M email contact database should live as a shared service (`contact-store`) consumed by any project that needs audience targeting.

### 2. Business Orchestration Suite

The aggregate of services that keep a business running, healthy, and visible to the founder.

| Service | Description | Components Used | Current State |
|---------|-------------|-----------------|---------------|
| `testing-dashboard` | E2E test coverage, Playwright execution, journey playback, seed/reset data | `e2e-runner`, `seed-engine`, `test-dashboard`, `coverage-viewer`, `journey-mapper` | AVAILABLE — [reference platform](./platforms/testing-platform/) |
| `monitoring-dashboard` | Health checks, errors, sales data, milemarkers, ideas, founder input | `metric-beacon`, `metric-snapshot` | Planned |
| `deployment-dashboard` | See all deployments, CI/CD pipeline status, rollback capability | `deploy-script` | Planned |
| `launch-pad` | God Mode entry point — catch requests, classify, route to executor | Standalone | Scaffolded |

#### Monitoring Architecture (Lightweight)

```
END SYSTEMS (app, analytics, campaigns, KH, escalations, founder)
    │
    │ publish: single-line Prometheus-style text exposition
    │ Use Cases: health check, errors, sales data, issues, milemarkers, ideas
    ▼
METRIC ENDPOINT (simple HTTP endpoint per project)
    │
    │ poll: single snapshot, only when necessary
    ▼
BIZ MONITOR (saves last snapshot as TXT in local dir, evaluates thresholds)
    │
    │ render from history
    ▼
DASHBOARD (live view: North Star progress, system health, hypotheses, outcomes)
```

**Compare Notes With:** PostHog (analytics + session replay + feature flags). Worth evaluating as complement or replacement for custom monitoring on the analytics dimension.

### 3. Business Creation + Exit Suite

The aggregate of services that help stand up a new business entity and eventually exit.

| Service | Description | Components Used | Current State |
|---------|-------------|-----------------|---------------|
| `biz-registration` | Business registration workflow (LLC, EIN, state filing) | TBD | Planned |
| `biz-taxes` | Tax preparation and filing coordination | TBD | Planned |
| `biz-finance` | Basic bookkeeping, revenue tracking, expense categorization | TBD | Planned |
| `vendor-listing` | List business on small business vendor/marketplace sites | TBD | Planned |
| `biz-exit` | Prepare business for sale or shutdown (documentation, valuation, listing) | TBD | Planned |

---

## How Services Get Consumed

When a PUMP creates or enhances a business project:

1. **1KH v4 identifies** which services the business needs
2. **Greenspaces manifest** (`greenspaces.json`) is generated listing service dependencies
3. **OpenClaw pulls** the service definitions and wires them into the business dashboard
4. **Custom logic** specific to that business is layered on top of the shared services
5. **The business dashboard** becomes the single interface — not 5 separate platform URLs

### Example: Man vs Health Dashboard

```
MVH Dashboard
├── Health Coaching (custom MVH logic)
├── Lab Integration (custom MVH logic + browser-watcher)
├── Video Campaigns (vid-campaign + vidgen + vidpub)
├── Email Campaigns (cold-email + contact-store)
├── Social Engagement (social-engage)
├── Monitoring (monitoring-dashboard)
└── Testing (testing-dashboard)
```

### Example: New Store Business Dashboard

```
Store Dashboard
├── Product Listings (custom store logic)
├── Product Videos (vid-campaign + vidgen + vidpub)
│   └── NOTE: video IS the product listing — created together, inseparable
├── Email Campaigns (cold-email + contact-store)
├── Monitoring (monitoring-dashboard)
└── Testing (testing-dashboard)
```

---

## Migration Path

The existing standalone platforms (video-platform, social-dm-platform, mass-email-platform) need to be **scrapped for parts**:

1. **Identify** which logic in each platform is truly reusable
2. **Extract** into Greenspaces shared components
3. **Retire** the standalone platform repos (move to archive)
4. **Rebuild** as services consumed by business dashboards

This is NOT urgent. It happens organically as new projects need these capabilities and the shared components get extracted during REFACTOR phases.

---

## Relationship to 1KH v4

The 1KH v4 spec defines WHEN and HOW Greenspaces gets invoked:

- During PUMP supercharging: "This project needs these Greenspaces services"
- During GROOMING: "This task could be a shared component"
- During EXECUTION: "Build this as a shared component" (for new shared functionality)
- During REFACTOR: "Extract this duplicate into Greenspaces"

Greenspaces is the WHAT. 1KH v4 is the WHEN and HOW.
