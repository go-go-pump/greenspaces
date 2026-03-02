# version-tracker — Interface Contract

> **Version:** 1.0.0

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | Yes | Project identifier |
| `environment` | `string` | Yes | Environment name |
| `version` | `string` | Yes | New version string |

## Output

```jsonc
{
  "projectId": "mvh",
  "environments": {
    "production": { "version": "2.4.1", "deployedAt": "2026-03-02T03:00:00Z" },
    "staging": { "version": "2.5.0-rc.1", "deployedAt": "2026-03-01T18:00:00Z" }
  },
  "drift": {
    "staging-vs-production": "+1 minor"
  }
}
```

## Drift Levels

| Level | Condition | Example |
|-------|-----------|---------|
| OK | staging ≤ 1 minor ahead | `2.4.1` vs `2.5.0-rc.1` |
| Warning | staging 2+ minors ahead | `2.4.1` vs `2.6.0` |
| Critical | production ahead of staging | `2.5.0` vs `2.4.0` |
