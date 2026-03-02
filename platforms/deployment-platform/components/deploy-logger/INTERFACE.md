# deploy-logger — Interface Contract

> **Version:** 1.0.0

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `DeployEvent` | Yes | Structured deploy event JSON |

## Output

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | `string` | Confirmed event ID |
| `status` | `string` | `accepted` or `rejected` |
| `errors` | `string[]` | Validation errors (if rejected) |

## Behavior

1. Validate `event` against deploy event schema
2. If invalid → return `rejected` with errors
3. If valid → enrich, append to deploy-history, update version-tracker
4. Return `accepted` with confirmed eventId
