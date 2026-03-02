# Testing Platform — Interface Contract

> **Version:** 1.0.0
> **Last Updated:** March 2, 2026

---

## Input Contract

### Required Inputs (from consuming project)

| Input | Type | Description |
|-------|------|-------------|
| `journeyMaps` | `JourneyMap[]` | Array of journey map JSON files (see `journey-map.template.json`) |
| `seedScripts` | `SeedScript[]` | Per-stage seed scripts (see `seed-script.template.mjs`) |
| `playwrightConfig` | `PlaywrightConfig` | Project-specific Playwright configuration |
| `dbPath` | `string` | Path to SQLite database (or connection config for other DBs) |
| `baseUrl` | `string` | Base URL of the application under test |
| `dashboardRoute` | `string` | Route where test dashboard is mounted (default: `/admin/testing`) |

### Optional Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `testTag` | `string` | `is_test` | Column name used to tag test data |
| `screenshotDir` | `string` | `./test/screenshots` | Where to save test screenshots |
| `traceDir` | `string` | `./test/traces` | Where to save Playwright traces |
| `metricEndpoint` | `string` | `null` | URL for metric-beacon result emission |

### Environment Variables

```bash
TEST_MODE=true              # Activates mock adapters, disables external calls
BASE_URL=http://localhost:3000
DB_PATH=./data/test.sqlite
SCREENSHOT_DIR=./test/screenshots
TRACE_DIR=./test/traces
```

---

## Output Contract

### E2E Runner Output

```jsonc
{
  "runId": "run_20260302_030000",
  "timestamp": "2026-03-02T03:00:00Z",
  "status": "passed" | "failed" | "partial",
  "totalTests": 12,
  "passed": 11,
  "failed": 1,
  "skipped": 0,
  "duration": 45000,  // ms
  "journeys": [
    {
      "journeyId": "campaign-lifecycle",
      "steps": [
        { "step": 1, "name": "Create Campaign", "status": "passed", "duration": 3200 },
        { "step": 2, "name": "Configure Audience", "status": "passed", "duration": 2100 },
        { "step": 3, "name": "Send Campaign", "status": "failed", "error": "Timeout waiting for send confirmation", "screenshot": "./test/screenshots/step3_failure.png" }
      ]
    }
  ],
  "artifacts": {
    "screenshots": ["./test/screenshots/..."],
    "traces": ["./test/traces/..."],
    "report": "./test/results/report.html"
  }
}
```

### Seed Engine Output

```jsonc
{
  "seedId": "seed_step3_20260302",
  "stage": "campaign-sent",
  "entitiesCreated": {
    "users": 1,
    "campaigns": 1,
    "emails": 50,
    "metrics": 50
  },
  "taggedWith": "is_test",
  "resetCommand": "node test/seeds/reset.mjs"
}
```

### Coverage Viewer Output

```jsonc
{
  "totalJourneys": 4,
  "coveredJourneys": 3,
  "coveragePercent": 75,
  "uncoveredSteps": [
    { "journey": "campaign-lifecycle", "step": "publish-results", "reason": "No test defined" }
  ]
}
```

---

## Integration Guide

### Step 1: Add to greenspaces.json

```jsonc
{
  "platforms": {
    "testing-platform": {
      "version": "1.0.0",
      "components": ["e2e-runner", "test-dashboard", "seed-engine", "coverage-viewer", "journey-mapper"],
      "config": {
        "journeyMaps": "./test/journeys/",
        "seeds": "./test/seeds/",
        "dashboardRoute": "/admin/testing",
        "dbPath": "./data/app.sqlite",
        "baseUrl": "http://localhost:3000"
      }
    }
  }
}
```

### Step 2: Define Journey Maps

Create `./test/journeys/<name>.journey.json` using the journey map schema. Each journey defines the step-by-step user flow, expected state transitions, and completion criteria.

### Step 3: Write Seed Scripts

Create `./test/seeds/seed-step-<N>.mjs` for each journey stage. Each script inserts deterministic data with `is_test = true` tagging.

### Step 4: Configure Playwright

Copy `playwright.config.template.ts` to your project root and customize:
- `baseURL` — your dev server
- `testDir` — where your specs live
- `outputDir` — artifacts location

### Step 5: Mount Dashboard

Add the test dashboard route to your app:

```javascript
// Express example
import { createTestDashboard } from 'testing-platform/components/test-dashboard';

app.use('/admin/testing', createTestDashboard({
  journeyDir: './test/journeys',
  seedDir: './test/seeds',
  dbPath: './data/app.sqlite',
}));
```

### Step 6: Run

```bash
# Seed to a specific stage
node test/seeds/seed-step-3.mjs

# Run E2E tests
TEST_MODE=true npx playwright test

# Reset all test data
node test/seeds/reset.mjs
```

---

## Component Interfaces

Each component has its own `INTERFACE.md` with detailed input/output contracts:

- [e2e-runner/INTERFACE.md](./components/e2e-runner/INTERFACE.md)
- [test-dashboard/INTERFACE.md](./components/test-dashboard/INTERFACE.md)
- [seed-engine/INTERFACE.md](./components/seed-engine/INTERFACE.md)
- [coverage-viewer/INTERFACE.md](./components/coverage-viewer/INTERFACE.md)
- [journey-mapper/INTERFACE.md](./components/journey-mapper/INTERFACE.md)
