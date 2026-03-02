# test-dashboard — Interface Contract

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `journeyDir` | `string` | Yes | Path to journey map JSON files |
| `seedDir` | `string` | Yes | Path to seed/reset scripts |
| `dbPath` | `string` | Yes | Path to project database |
| `baseUrl` | `string` | No | App URL for test execution (default: localhost:3000) |

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/journeys` | List all journey maps |
| POST | `/api/seed/:step` | Run seed script for given step |
| POST | `/api/run` | Execute Playwright suite |
| POST | `/api/reset` | Run reset script |
| GET | `/api/results` | Get latest test results JSON |
| GET | `/api/coverage` | Get coverage summary |

## Output

HTML dashboard rendering test state, results, and coverage. No server-side rendering — pure static HTML + fetch calls.

## Dependencies

- None (vanilla HTML/JS/CSS)
