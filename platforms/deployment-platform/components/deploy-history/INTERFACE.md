# deploy-history — Interface Contract

> **Version:** 1.0.0

## Input (Write)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `DeployEvent` | Yes | Validated deploy event to store |

## Input (Query)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | No | Filter by project |
| `environment` | `string` | No | Filter by environment |
| `status` | `string` | No | Filter by status |
| `limit` | `number` | No | Max results (default: 50) |
| `offset` | `number` | No | Pagination offset |
| `since` | `string` | No | ISO 8601 date filter |

## Output (Query)

```jsonc
{
  "total": 147,
  "limit": 50,
  "offset": 0,
  "results": [
    {
      "eventId": "deploy_20260302_030000_abc123",
      "timestamp": "2026-03-02T03:00:00Z",
      "projectId": "mvh",
      "environment": "production",
      "version": "2.4.1",
      "status": "success",
      "actor": "openclaw",
      "actorType": "ai"
    }
  ]
}
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/history` | Query deploy events |
| GET | `/api/history/:eventId` | Get single event |
| GET | `/api/stats` | Deploy frequency, success rate |
