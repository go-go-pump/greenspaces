# journey-mapper — Interface Contract

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `journeyDir` | `string` | Yes | Path to journey map JSON files |
| `seedDir` | `string` | No | Path to seed scripts (for cross-validation) |
| `specDir` | `string` | No | Path to spec files (for cross-validation) |

## Output

### Validation Result

```jsonc
{
  "valid": "boolean",
  "journeys": ["string"],
  "errors": [{ "journeyId": "string", "field": "string", "message": "string" }],
  "warnings": [{ "journeyId": "string", "message": "string" }]
}
```

### Step Index

```jsonc
{
  "totalSteps": "number",
  "steps": [
    { "journeyId": "string", "step": "number", "name": "string", "seedScript": "string | null", "testSpec": "string | null" }
  ]
}
```

## Dependencies

- None
