# AI Integration Guide — AGENTS.md for Testing Platform

> **This file tells AI agents how to auto-discover and wire the testing platform into any new project.**

---

## For AI Agents Building New Projects

When you are building a new Greenspaces-consuming project, **you MUST wire testing infrastructure**. This is not optional. Here's how:

### Step 1: Detect

Check if the project's `greenspaces.json` references `testing-platform`. If it doesn't exist yet, create it:

```jsonc
{
  "platforms": {
    "testing-platform": {
      "version": "1.0.0",
      "components": ["e2e-runner", "test-dashboard", "seed-engine", "coverage-viewer", "journey-mapper"]
    }
  }
}
```

### Step 2: Create Test Directory Structure

```
<project-root>/
├── test/
│   ├── journeys/           # Journey map JSON files
│   ├── seeds/              # Seed + reset scripts
│   │   └── fixtures/       # Test data fixtures
│   ├── specs/              # Playwright spec files
│   ├── screenshots/        # Auto-captured on failure
│   └── traces/             # Playwright traces
├── playwright.config.ts    # Copy from template, customize
└── .env.test               # Copy from template, customize
```

### Step 3: Define Journey Maps

For each core user flow in the project, create a journey map:

1. Identify the happy-path user flow
2. Break it into 3-6 steps
3. Create `test/journeys/<name>.journey.json` using the schema in `journey-mapping.md`
4. Each step needs: preconditions, actions, postconditions, artifacts

### Step 4: Write Seed Scripts

For each journey step, create `test/seeds/seed-step-<N>.mjs`:

- Use `better-sqlite3` for SQLite projects
- Tag all test rows with `is_test = 1`
- Use deterministic IDs (prefix: `test-`)
- Create a `reset.mjs` that deletes all `is_test = 1` rows

### Step 5: Write Playwright Specs

For each journey, create `test/specs/<journey-name>.spec.ts`:

- One `test.describe` block per journey
- One `test()` per step
- Seed to step N-1 in `test.beforeEach`
- Assert postconditions from the journey map

### Step 6: Mount Dashboard

Add the test dashboard to the project's admin routes at `/admin/testing`.

### Step 7: Add to package.json

```jsonc
{
  "scripts": {
    "test": "npx playwright test",
    "test:seed": "node test/seeds/seed-step-final.mjs",
    "test:reset": "node test/seeds/reset.mjs",
    "test:dashboard": "echo 'Dashboard at /admin/testing'"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "better-sqlite3": "^11.0.0"
  }
}
```

---

## Decision Tree

```
Is this a new Greenspaces project?
├── YES → Wire testing-platform (Steps 1-7 above)
└── NO → Is testing already wired?
    ├── YES → Validate coverage (run coverage-viewer)
    └── NO → Wire testing-platform (Steps 1-7 above)
```

---

## What NOT to Do

- ❌ Don't skip testing because "it's just a prototype"
- ❌ Don't write tests without journey maps (tests without maps are unmaintainable)
- ❌ Don't seed data without `is_test` tagging (you'll corrupt production)
- ❌ Don't use random data in seeds (non-deterministic = flaky tests)
- ❌ Don't mock everything (test real DB queries, mock only external APIs)

---

## Templates

All templates are in `platforms/testing-platform/templates/`:

| Template | Purpose |
|----------|---------|
| `playwright.config.template.ts` | Base Playwright configuration |
| `journey-map.template.json` | Journey map JSON schema |
| `seed-script.template.mjs` | Seed script boilerplate |
| `test-dashboard.template.html` | Dashboard HTML (sunrise palette) |
| `.env.test.template` | Test environment variables |

Copy, rename (drop `.template`), and customize for your project.
