# AI Integration Guide

> **Last Updated:** March 2, 2026

---

## AGENTS.md-Style Auto-Wiring

Any AI agent that deploys code in the MilliPrime ecosystem should automatically discover and integrate with the deployment platform. This is not optional — it's governance.

---

## Discovery

### For PUMP Executors (1KH v4)

During project creation or enhancement, the executor checks:

1. Does `greenspaces.json` reference `deployment-platform`?
2. If not → add it, generate deploy hook from templates
3. If yes → respect existing config, emit events on every deploy

### For OpenClaw

Add to your project's `AGENTS.md`:

```markdown
## Deployment

This project uses the Greenspaces deployment platform.
After every deploy, emit a deploy event via `./scripts/deploy-hook.sh`.

- Deploy hook: `./scripts/deploy-hook.sh`
- History DB: `./data/deploy-history.sqlite`
- Dashboard: `/admin/deployments`
```

OpenClaw reads this and knows to:
1. Source the deploy hook after running deploy commands
2. Set `DEPLOY_ACTOR=openclaw` and `DEPLOY_ACTOR_TYPE=ai`
3. Check deploy history for recent failures before deploying again

---

## AI Agent Deploy Protocol

When an AI agent deploys:

```bash
# Set AI actor metadata
export DEPLOY_ACTOR=openclaw
export DEPLOY_ACTOR_TYPE=ai
export DEPLOY_START_TIME=$(date +%s%3N)

# Run the deploy
./deploy.sh

# Hook emits event automatically (sourced inside deploy.sh)
```

### Pre-Deploy Check

Before deploying, the agent SHOULD:

1. Query deploy-history for the last event in this environment
2. If the last deploy was a `failure` → warn or abort
3. If the last deploy was < 5 minutes ago → warn about rapid deploys

```bash
# Check last deploy status
sqlite3 ./data/deploy-history.sqlite \
  "SELECT status FROM deploy_events WHERE project_id='$PROJECT' AND environment='$ENV' ORDER BY timestamp DESC LIMIT 1;"
```

### Post-Deploy Verification

After deploying, the agent SHOULD:

1. Verify the deploy event was recorded
2. Check that version-tracker reflects the new version
3. Optionally run a smoke test (via testing-platform integration)

---

## Integration with Other Platforms

### Testing Platform

After a deploy succeeds, the AI agent can automatically trigger the testing platform:

```
Deploy success → Run E2E smoke tests → Report results
```

Both deploy events and test results feed into the monitoring dashboard.

### Monitoring Platform

Deploy events are emitted to `metric-beacon` (when configured), making deploys visible on the monitoring dashboard alongside health metrics.

---

## TRON Compatibility (Phase 2)

When TRONs (Phase 2) manage deployments, the AI integration protocol extends:

1. TRON receives deploy request
2. TRON runs pre-deploy checks (history, tests, version drift)
3. TRON executes deploy
4. TRON verifies and emits event
5. TRON decides: roll-forward or roll-back based on post-deploy health

See [future-psd-trons.md](./future-psd-trons.md) for the full Phase 2 vision.
