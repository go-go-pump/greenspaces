# e2e-runner — Interface Contract

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `configPath` | `string` | Yes | Path to playwright.config.ts |
| `baseUrl` | `string` | Yes | Application base URL |
| `testDir` | `string` | Yes | Directory containing .spec.ts files |
| `screenshotDir` | `string` | No | Screenshot output (default: `./test/screenshots`) |
| `traceDir` | `string` | No | Trace output (default: `./test/traces`) |

## Output

```jsonc
{
  "runId": "string",
  "timestamp": "ISO8601",
  "status": "passed | failed | partial",
  "totalTests": "number",
  "passed": "number",
  "failed": "number",
  "duration": "number (ms)",
  "journeys": [{ "journeyId": "string", "steps": [{ "step": "number", "name": "string", "status": "string" }] }],
  "artifacts": { "screenshots": ["string"], "traces": ["string"], "report": "string" }
}
```

## Dependencies

- `@playwright/test` ^1.40.0
