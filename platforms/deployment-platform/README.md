# Deployment Platform — Reference Platform

> **Type:** Platform (reference architecture)
> **Domain:** Deploy event logging, version tracking, deployment history, visibility dashboards
> **Status:** AVAILABLE — docs + interfaces + templates ready for consumption

---

## Overview

The Deployment Platform is a curated assembly of Greenspaces components that together deliver **founder-visible deployment infrastructure**: every deploy logged, every version tracked, every rollback visible — all through a vanilla HTML dashboard wirable by an AI agent without human instruction.

This document is the **reference architecture**. Each business creates its own platform instance by wiring these components with its domain-specific deploy hooks and version schemes.

---

## AI Governance — SELF-DEPLOY

> **Any AI agent deploying a Greenspaces project MUST auto-discover this platform and emit deploy events.**

When an AI agent (1KH v4, OpenClaw, or any PUMP executor) deploys code:

1. **Detect** — Check `greenspaces.json` or CATALOG.md for `deployment-platform`
2. **Wire** — Pull component interfaces, generate project-specific deploy hooks from templates
3. **Emit** — Log every deploy event (success, failure, rollback) via `deploy-logger`
4. **Report** — Render deploy history on the dashboard for founder visibility

No human should need to ask "what deployed?" The deployment platform is **assumed infrastructure**, like version control or a database.

---

## Philosophy

Deployment is not an invisible backend operation — it's a **founder-visible state change**.

- **Phase 1: Reflection Only.** The deployment platform observes and records. It does not orchestrate deploys. Your existing `deploy.sh` scripts keep working — this platform gives them a voice.
- **Founder-First:** See what deployed, when, by whom (human or AI), and whether it succeeded. One glance.
- **Event-Driven:** Deploys emit structured JSON events. Everything downstream reads events.
- **Deterministic:** Same deploy event → same dashboard state → same history query. Every time.
- **Visual:** The sunrise-palette dashboard provides observable proof, not terminal output scrollback.
- **AI-Discoverable:** An AI agent deploying a project should find this and wire it up unprompted.

---

## Core Components

| Component | Role | Status |
|-----------|------|--------|
| [`deploy-logger`](./components/deploy-logger/) | Receives deploy events, validates schema, appends to history | AVAILABLE |
| [`deploy-dashboard`](./components/deploy-dashboard/) | Vanilla HTML dashboard: deploy timeline, status, version info | AVAILABLE |
| [`version-tracker`](./components/version-tracker/) | Tracks semantic versions per project/environment, detects drift | AVAILABLE |
| [`deploy-history`](./components/deploy-history/) | SQLite-backed deploy event storage and query API | AVAILABLE |

---

## Consumption Model

Projects don't fork the deployment platform. They **reference** it:

```jsonc
// greenspaces.json (in consuming project)
{
  "platforms": {
    "deployment-platform": {
      "components": ["deploy-logger", "deploy-dashboard", "version-tracker", "deploy-history"],
      "deployHook": "./scripts/deploy-hook.sh",
      "dashboardRoute": "/admin/deployments",
      "historyDb": "./data/deploy-history.sqlite"
    }
  }
}
```

### Setup Steps

1. Copy `deploy-hook.template.sh` into your project's deploy script
2. Configure `deploy-event.template.json` with your project/environment names
3. Mount the deploy dashboard at `/admin/deployments`
4. Run deploys as normal — events are emitted automatically

---

## Platform Instances

### Man vs Health

```
MVH Dashboard
└── Deployments (/admin/deployments)
    ├── deploy-logger (captures SST/CDK deploy events)
    ├── deploy-dashboard (visual deploy timeline)
    ├── version-tracker (API + frontend + infra versions)
    └── deploy-history (SQLite: full deploy audit trail)
```

### YOMO (Experience Listings)

```
YOMO Dashboard
└── Deployments (/admin/deployments)
    ├── deploy-logger (captures deploy.sh events)
    ├── deploy-dashboard (visual deploy timeline)
    ├── version-tracker (app + vidgen versions)
    └── deploy-history (SQLite: full deploy audit trail)
```

### Any New Business

```
Business Dashboard
└── Deployments (/admin/deployments)
    ├── deploy-logger ([business-specific deploy hooks])
    ├── deploy-dashboard (visual deploy timeline)
    ├── version-tracker ([business-specific version scheme])
    └── deploy-history (SQLite: full deploy audit trail)
```

---

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Deploy event logging | Free | Local file/SQLite append |
| Dashboard | Free | Vanilla HTML, no framework |
| Version tracking | Free | JSON + SQLite |
| History queries | Free | SQLite reads |

**Total: $0.** Deployment visibility should never cost money.

---

## Origin

Identified in the Business Orchestration Suite ([SERVICES.md](../../SERVICES.md)) as `deployment-dashboard` — a planned service for deployment visibility. Extracted as a reusable Greenspaces platform so every future project gets deployment infrastructure automatically.

---

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contracts
- [docs/architecture.md](./docs/architecture.md) — Component diagram
- [docs/ai-integration.md](./docs/ai-integration.md) — AI agent auto-wiring guide
- [docs/future-psd-trons.md](./docs/future-psd-trons.md) — Phase 2: Point-and-Shoot Deployments
- [examples/yomo/](./examples/yomo/) — Working example with YOMO
