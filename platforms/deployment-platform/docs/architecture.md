# Deployment Platform — Architecture

> **Last Updated:** March 2, 2026

---

## Component Diagram

```
EXISTING DEPLOY SCRIPTS (deploy.sh, SST, CDK, Docker Compose)
    │
    │ emit: structured JSON deploy event (via deploy-hook.sh)
    ▼
DEPLOY-LOGGER (validates schema, enriches with git metadata)
    │
    ├──► DEPLOY-HISTORY (SQLite: append event, query API)
    │
    ├──► VERSION-TRACKER (update version map, detect drift)
    │
    └──► METRIC-BEACON (optional: emit deploy metric for monitoring-platform)
         │
         ▼
DEPLOY-DASHBOARD (vanilla HTML: timeline, versions, status)
    │
    │ reads from: deploy-history SQLite + version-tracker JSON
    ▼
FOUNDER (sees what deployed, when, by whom, success/failure)
```

---

## Data Flow

### 1. Deploy Event Emission

The deploy hook (`deploy-hook.sh`) runs at the end of any deploy script. It:

1. Captures git SHA, commit message, branch, and timestamp
2. Reads the current version from `version.json` or `package.json`
3. Constructs a `DeployEvent` JSON object
4. POSTs it to deploy-logger (or writes directly to deploy-history SQLite)

### 2. Event Processing

Deploy-logger receives the event and:

1. Validates against `deploy-event-schema.json`
2. Enriches with computed fields (duration, previous version, drift)
3. Appends to deploy-history SQLite
4. Updates version-tracker state
5. Optionally emits to metric-beacon

### 3. Dashboard Rendering

The deploy-dashboard reads from:

- `deploy-history.sqlite` — full event timeline
- `version-tracker` state — current versions per environment

Renders as static HTML with inline JS (no framework, no build step).

---

## Storage

| Store | Format | Purpose |
|-------|--------|---------|
| `deploy-history.sqlite` | SQLite | Append-only deploy event log |
| `version.json` | JSON | Current version per project per environment |
| `deploy-events/*.json` | JSON files | Optional flat-file backup of events |

### SQLite Schema

```sql
CREATE TABLE deploy_events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  version TEXT NOT NULL,
  previous_version TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rollback')),
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'ai', 'ci')),
  duration_ms INTEGER,
  commit_sha TEXT,
  commit_message TEXT,
  metadata TEXT  -- JSON blob for extensibility
);

CREATE INDEX idx_deploy_project_env ON deploy_events(project_id, environment);
CREATE INDEX idx_deploy_timestamp ON deploy_events(timestamp DESC);
```

---

## Security

- Deploy events are **append-only**. No update or delete operations.
- Dashboard is mounted behind `/admin/` — same auth as other admin routes.
- No secrets in deploy events. Sensitive config stays in `.env` files.
- SQLite file permissions: readable by app process only.

---

## Phase 1 vs Phase 2

| Aspect | Phase 1 (Reflection) | Phase 2 (Orchestration) |
|--------|---------------------|------------------------|
| Deploy trigger | External (`deploy.sh`) | Platform-initiated (TRONs) |
| Event flow | Post-hoc logging | Pre/during/post lifecycle |
| Rollback | Manual | Automated roll-forward/roll-back |
| Environments | Multi-env (prod/staging/local) | Single branch, no staging |
| DNS | Manual | Automated switchover |

See [future-psd-trons.md](./future-psd-trons.md) for Phase 2 architecture.
