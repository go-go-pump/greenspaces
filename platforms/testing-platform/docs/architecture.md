# Testing Platform — Architecture

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TEST DASHBOARD                                │
│                   (vanilla HTML/JS, /admin/testing)                   │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │  Seed     │  │  Run     │  │  Reset   │  │  Coverage Overview   │ │
│  │  Buttons  │  │  Tests   │  │  Data    │  │  (journey heatmap)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘ │
└───────┼──────────────┼──────────────┼───────────────────┼────────────┘
        │              │              │                     │
        ▼              ▼              ▼                     ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────────┐
│ SEED ENGINE  │ │ E2E RUNNER │ │ SEED ENGINE  │ │COVERAGE VIEWER │
│              │ │            │ │  (reset mode)│ │                │
│ - Read       │ │ - Playwright│ │ - DELETE     │ │ - Parse journey│
│   journey map│ │   execution│ │   WHERE      │ │   maps         │
│ - INSERT     │ │ - Traces   │ │   is_test=1  │ │ - Cross-ref    │
│   test data  │ │ - Screenshots│              │ │   with specs   │
│ - Tag        │ │ - Reports  │ └──────────────┘ │ - Generate     │
│   is_test=1  │ └─────┬──────┘                   │   coverage HTML│
└──────┬───────┘       │                           └────────────────┘
       │               │
       ▼               ▼
┌─────────────────────────────────────┐
│           PROJECT DATABASE           │
│     (SQLite / Supabase / any)        │
│                                      │
│  All test rows tagged: is_test = 1   │
│  Production data: is_test = 0/NULL   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          JOURNEY MAPPER              │
│                                      │
│  - Validates journey map JSON        │
│  - Generates step index              │
│  - Feeds seed-engine + e2e-runner    │
│  - Feeds coverage-viewer             │
└─────────────────────────────────────┘
```

---

## Data Flow

```
1. DEFINE    journey-mapper validates journey-map.json
                  │
2. SEED      seed-engine reads journey map → inserts test data at target stage
                  │
3. TEST      e2e-runner executes Playwright specs against seeded state
                  │
4. REPORT    test results → dashboard display + optional metric-beacon emission
                  │
5. RESET     seed-engine deletes all rows WHERE is_test = 1
                  │
6. COVERAGE  coverage-viewer cross-references journey steps with test specs
```

---

## Integration Points

| Integration | Direction | Protocol |
|-------------|-----------|----------|
| Project DB | Read/Write | SQLite `better-sqlite3` or DB adapter |
| Project App | HTTP | Playwright drives the running app |
| metric-beacon | Write (optional) | HTTP POST to metric endpoint |
| Monitoring Dashboard | Read (optional) | Consumes metric-beacon data |
| CI/CD | Trigger | `npx playwright test` in pipeline |

---

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Test Framework:** Playwright
- **Dashboard:** Vanilla HTML/JS/CSS (no framework)
- **Database:** SQLite (default), adapter pattern for others
- **Package Manager:** npm
- **CI Integration:** Any (GitHub Actions, local cron, manual)
