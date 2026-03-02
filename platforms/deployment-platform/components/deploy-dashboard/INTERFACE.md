# deploy-dashboard — Interface Contract

> **Version:** 1.0.0

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `historyDb` | `string` | Yes | Path to deploy-history SQLite database |
| `projectId` | `string` | No | Filter to single project (default: all) |

## Output

Vanilla HTML page with:
- Deploy event timeline (most recent first)
- Version map per environment
- Deploy frequency metrics
- Status distribution chart

## Mount

```javascript
app.use('/admin/deployments', createDeployDashboard({ historyDb, projectId }));
```

## Palette

| Color | Hex | Use |
|-------|-----|-----|
| Coral | `#E8735A` | Failure / alerts |
| Sandy | `#F4A261` | Rollback / warnings |
| Sunrise | `#FFD166` | Success / highlights |
