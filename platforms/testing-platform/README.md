# Testing Platform — Reference Platform

> **Type:** Platform (reference architecture)
> **Domain:** End-to-end testing, seed data management, journey validation
> **Status:** AVAILABLE — docs + interfaces + templates ready for consumption

---

## Overview

The Testing Platform is a curated assembly of Greenspaces components that together deliver **founder-operable testing infrastructure**: journey-mapped E2E tests, deterministic seed data, coverage visualization, and a vanilla HTML dashboard — all wirable by an AI agent without human instruction.

This document is the **reference architecture**. Each business creates its own platform instance by wiring these components with its domain-specific journeys and seed data.

---

## AI Governance — SELF-TEST

> **Any AI agent building a new Greenspaces project MUST auto-discover this platform and wire testing infrastructure.**

When an AI agent (1KH v4, OpenClaw, or any PUMP executor) creates or enhances a project:

1. **Detect** — Check `greenspaces.json` or CATALOG.md for `testing-platform`
2. **Wire** — Pull component interfaces, generate project-specific journey maps and seed scripts from templates
3. **Validate** — Run the generated E2E suite before marking any milestone as complete
4. **Report** — Emit test results via `metric-beacon` for monitoring dashboard consumption

No human should need to say "add tests." The testing platform is **assumed infrastructure**, like a database or a web server.

---

## Philosophy

Testing is not a phase — it's a **continuous proof of operational confidence**.

- **Founder-First:** Operable without engineering involvement. Click a button, see results.
- **Journey-Driven:** Tests follow the user's actual path, not implementation details.
- **Deterministic:** Same seed → same state → same result. Every time.
- **Visual:** The dashboard provides observable proof, not just pass/fail text.
- **Production-Safe:** Simulates production behavior with zero production risk via `is_test` flags.
- **AI-Discoverable:** An AI agent building a new project should find this and wire it up unprompted.

---

## Core Components

| Component | Role | Status |
|-----------|------|--------|
| [`e2e-runner`](./components/e2e-runner/) | Playwright test execution, trace capture, screenshot collection | AVAILABLE |
| [`test-dashboard`](./components/test-dashboard/) | Vanilla HTML dashboard: seed, run, reset, view results | AVAILABLE |
| [`seed-engine`](./components/seed-engine/) | Deterministic data seeding per journey stage, `is_test` tagging | AVAILABLE |
| [`coverage-viewer`](./components/coverage-viewer/) | Visual coverage map: which journeys are tested, which aren't | AVAILABLE |
| [`journey-mapper`](./components/journey-mapper/) | Define and validate journey maps (JSON schema) | AVAILABLE |

---

## Consumption Model

Projects don't fork the testing platform. They **reference** it:

```jsonc
// greenspaces.json (in consuming project)
{
  "platforms": {
    "testing-platform": {
      "components": ["e2e-runner", "test-dashboard", "seed-engine", "coverage-viewer", "journey-mapper"],
      "journeyMaps": "./test/journeys/",
      "seeds": "./test/seeds/",
      "dashboardRoute": "/admin/testing"
    }
  }
}
```

### Setup Steps

1. Define journey maps using `journey-map.template.json`
2. Write seed scripts using `seed-script.template.mjs`
3. Configure Playwright using `playwright.config.template.ts`
4. Mount the test dashboard at `/admin/testing`
5. Run: `npx playwright test`

---

## Platform Instances

### Man vs Health

```
MVH Dashboard
└── Testing (/admin/testing)
    ├── e2e-runner (Playwright: coaching signup → lab order → results)
    ├── seed-engine (patient fixtures, lab result mocks)
    ├── test-dashboard (visual seed/run/reset)
    └── journey-mapper (coaching lifecycle journey)
```

### YOMO (Experience Listings)

```
YOMO Dashboard
└── Testing (/admin/testing)
    ├── e2e-runner (Playwright: campaign create → video gen → publish → analytics)
    ├── seed-engine (campaign fixtures, video render mocks)
    ├── test-dashboard (visual seed/run/reset)
    └── journey-mapper (campaign lifecycle journey)
```

### Any New Business

```
Business Dashboard
└── Testing (/admin/testing)
    ├── e2e-runner (Playwright: [business-specific journeys])
    ├── seed-engine ([business-specific fixtures])
    ├── test-dashboard (visual seed/run/reset)
    └── journey-mapper ([business-specific journey maps])
```

---

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Playwright execution | Free | Local or CI |
| Seed data | Free | SQLite/local DB |
| Dashboard | Free | Vanilla HTML, no framework |
| Coverage viewer | Free | Static HTML generation |

**Total: $0.** Testing infrastructure should never cost money to run.

---

## Origin

Identified in the [Platform Testing Suite Handoff](../../docs/platform-testing-suite-handoff.md) as a cross-cutting need for Cold Email, Social DM, and VideoGen platforms. Extracted as a reusable Greenspaces platform so every future project gets testing infrastructure automatically.

---

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contracts
- [docs/architecture.md](./docs/architecture.md) — Component diagram
- [docs/ai-integration.md](./docs/ai-integration.md) — AI agent auto-wiring guide
- [examples/yomo/](./examples/yomo/) — Working example with YOMO campaign lifecycle
