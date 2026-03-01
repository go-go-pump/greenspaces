# Greenspaces — Shared Components Catalog

**Last Updated:** March 1, 2026

---

## What Qualifies as a Shared Component?

A shared component must meet ALL of the following criteria:

1. **Single Concern** — Does one thing well
2. **Multi-Project Consumption** — Used (or usable) by 2+ projects
3. **Deterministic** — Given the same inputs, produces the same outputs (wherever possible)
4. **Self-Contained** — Can be stood up without requiring AI to redefine from scratch
5. **Documented** — Has a README, interface contract, and usage examples
6. **Tested** — Has unit tests and integration contract tests

---

## Catalog Index

| Status | Component | Description | Consumed By | Source Origin |
|--------|-----------|-------------|-------------|---------------|
| `CANDIDATE` | `auth-otp` | Email OTP authentication (no passwords) | MVH, AIP Registry | MVH |
| `CANDIDATE` | `email-send` | SES email dispatch with template rendering | MVH, Mass Email Platform | MVH |
| `CANDIDATE` | `email-campaign-core` | Campaign sequencing engine (schedule, send, track) | Mass Email Platform, MVH | Mass Email Platform |
| `CANDIDATE` | `contact-store` | Multi-tenant contact database (up to 5M records, CSV import) | Mass Email Platform | Mass Email Platform |
| `CANDIDATE` | `browser-watcher` | Puppeteer-based browser automation utility | Social DM Platform, MVH (LabCorp) | BORABORA |
| `AVAILABLE` | `vidgen-pipeline` | Automated video generation (topic → MP4) | Video Platform, YOMO | Greenspaces (onboarded from Vidgen) |
| `CANDIDATE` | `vidpub` | YouTube publish + metadata (Data API v3 + Puppeteer fallback) | Video Platform | Video Platform |
| `CANDIDATE` | `vid-campaign` | Video campaign lifecycle (research → produce → publish → monitor) | Video Platform | Video Platform |
| `CANDIDATE` | `metric-beacon` | Lightweight metric publisher (Prometheus-style text exposition) | All projects | New |
| `CANDIDATE` | `metric-snapshot` | Polls metric endpoint, saves snapshot as TXT, evaluates thresholds | Monitoring Dashboard | New |
| `CANDIDATE` | `seed-manager` | Test data seeding + teardown for any SQLite/Supabase project | MVH, All future projects | MVH |
| `CANDIDATE` | `fb-auth` | Facebook cookie-based authentication (Puppeteer login + persistence) | Social DM Platform | BORABORA |
| `CANDIDATE` | `fb-graphql-scraper` | Facebook GraphQL interception for post/comment scraping | Social DM Platform | BORABORA |
| `CANDIDATE` | `llm-tagger` | LLM-powered content classification (Claude Haiku, structured JSON output) | Good Vibes, Video Platform | Good Vibes |
| `CANDIDATE` | `session-arc-composer` | Composes ordered content sequences with emotional pacing | Good Vibes | Good Vibes |
| `CANDIDATE` | `temporal-workflow-runner` | Temporal workflow execution wrapper | MVH | MVH |
| `PLANNED` | `deploy-script` | Standardized deployment (SST/CDK/Docker Compose) | All projects | New |
| `PLANNED` | `e2e-test-runner` | Playwright test execution + reporting | All projects | New |
| `PLANNED` | `guardrail-filter` | Ethical content filter (published exclusion rules) | Good Vibes, future platforms | Good Vibes |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `CANDIDATE` | Identified as shared component opportunity. Exists in a project but not yet extracted. |
| `EXTRACTING` | Being refactored out of source project into Greenspaces. |
| `AVAILABLE` | Extracted, documented, tested, ready for consumption. |
| `PLANNED` | Doesn't exist yet. Will be built as a shared component from day one. |
| `DEPRECATED` | Superseded or no longer maintained. |

---

## Lifecycle

### Identification
During GROOMING, the executor identifies potential shared components. Criteria: "Would another project benefit from this exact logic?" If yes → flag as `CANDIDATE` in this catalog.

### Extraction
During a designated REFACTOR phase (typically at the start of a new project phase, NOT mid-sprint):
1. Extract logic from source project
2. Create standalone directory in `shared-components/`
3. Write interface contract (inputs, outputs, config)
4. Write tests
5. Update source project to consume from Greenspaces
6. Update this catalog

### Ecosystem-Wide Changes
When a shared component changes in a way that affects consuming projects:
1. Identify all consumers from this catalog
2. Assess impact (breaking vs. additive)
3. If breaking → institute an "ecosystem-wide change" ticket that coordinates updates across all consumers
4. If additive → update component, notify consumers, they adopt at their pace

---

## Open Questions

- At what point do Temporal workflows get extracted as shared components?
- Should executable patterns (e.g., Abandonment Pattern from JM_PATTERNS) live here or in 1KH v4?
- Lambda functions that are reused across projects — component or service?
- How do we version shared components? Semver? Git tags? Both?
