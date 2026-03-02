# coverage-viewer — Interface Contract

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `journeyDir` | `string` | Yes | Path to journey map JSON files |
| `specDir` | `string` | Yes | Path to Playwright spec files |
| `outputPath` | `string` | No | Where to write coverage HTML (default: `./test/coverage.html`) |

## Output

```jsonc
{
  "totalJourneys": "number",
  "coveredJourneys": "number",
  "coveragePercent": "number",
  "journeys": [
    {
      "journeyId": "string",
      "totalSteps": "number",
      "coveredSteps": "number",
      "uncoveredSteps": [{ "step": "number", "name": "string" }]
    }
  ]
}
```

Also generates `coverage.html` — a static heatmap page.

## Dependencies

- None (reads JSON + .ts files, outputs HTML)
