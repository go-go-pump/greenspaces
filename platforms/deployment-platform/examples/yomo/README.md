# YOMO — Deployment Platform Example

> **Project:** YOMO (Experience Listings)
> **Purpose:** Demonstrates deployment platform integration for a real project

---

## What This Shows

- A `deploy-hook.sh` that emits events after YOMO deploys
- A `deploy-history.json` with sample deploy events (3 deploys: 2 success, 1 rollback)
- How AI agents (OpenClaw) and humans both appear in deploy history

## Files

| File | Description |
|------|-------------|
| `deploy-hook.sh` | YOMO-specific deploy hook (sources the template) |
| `deploy-history.json` | Sample deploy event history |

## Usage

```bash
# In YOMO project root
DEPLOY_PROJECT_ID=yomo DEPLOY_ENV=production ./deploy.sh
```

The deploy hook emits events automatically. View them at `/admin/deployments`.
