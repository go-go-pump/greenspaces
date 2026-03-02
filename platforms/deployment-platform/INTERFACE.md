# Deployment Platform — Interface Contract

> **Version:** 1.0.0
> **Last Updated:** March 2, 2026

---

## Input Contract

### Required Inputs (from consuming project)

| Input | Type | Description |
|-------|------|-------------|
| `deployEvents` | `DeployEvent[]` | Structured deploy event JSON (see `deploy-event.template.json`) |
| `projectId` | `string` | Unique identifier for the project being deployed |
| `environment` | `string` | Target environment (`production`, `staging`, `local`) |
| `historyDbPath` | `string` | Path to SQLite database for deploy history |
| `dashboardRoute` | `string` | Route where deploy dashboard is mounted (default: `/admin/deployments`) |

### Optional Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `versionScheme` | `string` | `semver` | Version scheme (`semver`, `calver`, `git-sha`) |
| `retentionDays` | `number` | `365` | How long to keep deploy history |
| `metricEndpoint` | `string` | `null` | URL for metric-beacon deploy event emission |
| `notifyOnFailure` | `boolean` | `true` | Emit alert event on deploy failure |

### Environment Variables

```bash
DEPLOY_PROJECT_ID=mvh
DEPLOY_ENV=production
DEPLOY_HISTORY_DB=./data/deploy-history.sqlite
DEPLOY_DASHBOARD_ROUTE=/admin/deployments
DEPLOY_VERSION_SCHEME=semver
```

---

## Output Contract

### Deploy Logger Output

```jsonc
{
  "eventId": "deploy_20260302_030000_abc123",
  "timestamp": "2026-03-02T03:00:00Z",
  "projectId": "mvh",
  "environment": "production",
  "version": "2.4.1",
  "previousVersion": "2.4.0",
  "status": "success",  // "success" | "failure" | "rollback"
  "actor": "openclaw",  // who/what triggered the deploy
  "actorType": "ai",    // "human" | "ai" | "ci"
  "duration": 42000,    // ms
  "commitSha": "abc1234def5678",
  "commitMessage": "fix: resolve OTP timeout on coaching signup",
  "artifacts": {
    "logs": "./deploys/deploy_20260302_030000.log",
    "diff": "https://github.com/org/repo/compare/v2.4.0...v2.4.1"
  }
}
```

### Deploy Dashboard Output

The dashboard renders a timeline of deploy events with:
- Color-coded status (green = success, red = failure, amber = rollback)
- Version progression chart
- Deploy frequency metrics (deploys/day, mean time between deploys)
- Actor breakdown (human vs AI vs CI)

### Version Tracker Output

```jsonc
{
  "projectId": "mvh",
  "environments": {
    "production": { "version": "2.4.1", "deployedAt": "2026-03-02T03:00:00Z" },
    "staging": { "version": "2.5.0-rc.1", "deployedAt": "2026-03-01T18:00:00Z" },
    "local": { "version": "2.5.0-dev", "deployedAt": "2026-03-02T02:00:00Z" }
  },
  "drift": {
    "staging-vs-production": "+1 minor",
    "local-vs-staging": "+0.0.1-dev"
  }
}
```

### Deploy History API Output

```jsonc
{
  "query": { "projectId": "mvh", "limit": 10, "status": "all" },
  "total": 147,
  "results": [
    { "eventId": "deploy_20260302_030000_abc123", "version": "2.4.1", "status": "success", "timestamp": "..." },
    { "eventId": "deploy_20260301_180000_def456", "version": "2.4.0", "status": "success", "timestamp": "..." }
  ]
}
```

---

## Integration Guide

### Step 1: Add to greenspaces.json

```jsonc
{
  "platforms": {
    "deployment-platform": {
      "version": "1.0.0",
      "components": ["deploy-logger", "deploy-dashboard", "version-tracker", "deploy-history"],
      "config": {
        "deployHook": "./scripts/deploy-hook.sh",
        "dashboardRoute": "/admin/deployments",
        "historyDb": "./data/deploy-history.sqlite",
        "projectId": "my-project",
        "versionScheme": "semver"
      }
    }
  }
}
```

### Step 2: Add Deploy Hook to Your Script

Append the deploy hook to your existing `deploy.sh`:

```bash
# At the end of your deploy.sh
source ./scripts/deploy-hook.sh
emit_deploy_event "$VERSION" "$ENV" "$STATUS"
```

### Step 3: Mount Dashboard

```javascript
// Express example
import { createDeployDashboard } from 'deployment-platform/components/deploy-dashboard';

app.use('/admin/deployments', createDeployDashboard({
  historyDb: './data/deploy-history.sqlite',
  projectId: 'my-project',
}));
```

### Step 4: Query History

```bash
# CLI query
sqlite3 ./data/deploy-history.sqlite "SELECT * FROM deploy_events ORDER BY timestamp DESC LIMIT 10;"

# API query (when dashboard is mounted)
curl http://localhost:3000/admin/deployments/api/history?limit=10
```

---

## Component Interfaces

Each component has its own `INTERFACE.md` with detailed input/output contracts:

- [deploy-logger/INTERFACE.md](./components/deploy-logger/INTERFACE.md)
- [deploy-dashboard/INTERFACE.md](./components/deploy-dashboard/INTERFACE.md)
- [version-tracker/INTERFACE.md](./components/version-tracker/INTERFACE.md)
- [deploy-history/INTERFACE.md](./components/deploy-history/INTERFACE.md)
