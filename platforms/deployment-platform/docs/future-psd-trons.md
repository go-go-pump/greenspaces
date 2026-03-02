# Future: Point-and-Shoot Deployments + TRONs

> **Phase 2 — Not Yet Implemented**
> **Last Updated:** March 2, 2026

---

## Vision

Phase 1 is reflection: observe and record. Phase 2 is **orchestration**: the deployment platform doesn't just log deploys — it *performs* them.

**Point-and-Shoot Deployments (PSD):** A founder (or AI agent) says "deploy this" and the platform handles everything — build, test, deploy, verify, rollback if needed. One trigger. No manual steps.

**TRONs (Trusted Runtime Orchestration Nodes):** Autonomous agents that own the full deploy lifecycle. A TRON receives a deploy intent, makes decisions, executes, and reports. Think: a deployment agent that knows when to roll forward and when to roll back.

---

## Key Principles

### Single Branch

No more `main` / `staging` / `develop` branch gymnastics. One branch. One truth. Deploy it or don't.

### No Staging Environment

Staging is a lie — it never matches production. Instead:
- **Preview deploys** for visual verification (ephemeral, auto-destroyed)
- **Feature flags** for gradual rollout
- **Canary deploys** for production validation with limited blast radius

### Roll-Forward / Roll-Back

Every deploy is either rolled forward (success) or rolled back (failure). No "fix forward" panic. The TRON decides automatically based on:

1. Health check results (within 60 seconds of deploy)
2. Error rate comparison (pre-deploy vs post-deploy)
3. Key metric regression (defined per project)

### DNS Switchover

For zero-downtime deploys:

1. Deploy new version to fresh target (new port, new container, new function)
2. Run health checks against new target
3. Switch DNS/routing to new target
4. Keep old target alive for 5 minutes (instant rollback window)
5. Tear down old target

---

## TRON Architecture

```
DEPLOY INTENT (founder clicks "deploy" or AI triggers)
    │
    ▼
TRON (Trusted Runtime Orchestration Node)
    │
    ├── 1. PRE-FLIGHT
    │   ├── Check last deploy status
    │   ├── Run test suite (testing-platform)
    │   ├── Validate version bump
    │   └── Check for open incidents
    │
    ├── 2. BUILD
    │   ├── Install dependencies
    │   ├── Run build step
    │   └── Generate deploy artifact
    │
    ├── 3. DEPLOY
    │   ├── Deploy to fresh target
    │   ├── Run health checks
    │   └── Compare error rates
    │
    ├── 4. DECIDE
    │   ├── Health OK? → ROLL FORWARD (switch DNS)
    │   └── Health BAD? → ROLL BACK (keep old target)
    │
    └── 5. REPORT
        ├── Emit deploy event (success/failure/rollback)
        ├── Update version tracker
        └── Notify founder (dashboard + optional push)
```

---

## TRON Decision Matrix

| Signal | Threshold | Action |
|--------|-----------|--------|
| Health check fails | Any endpoint returns non-200 | Roll back |
| Error rate spike | >2x baseline in first 60s | Roll back |
| Key metric regression | Defined per project | Roll back |
| All checks pass | N/A | Roll forward |
| Timeout (no signal) | 120s | Roll back (fail-safe) |

---

## Migration Path (Phase 1 → Phase 2)

1. **Phase 1** (current): Deploy hooks emit events. Dashboard shows history. Humans/AI trigger deploys externally.
2. **Phase 1.5**: Add pre-deploy checks (test suite, version validation). Still external trigger.
3. **Phase 2a**: TRONs wrap existing deploy scripts. Same logic, orchestrated lifecycle.
4. **Phase 2b**: DNS switchover. Zero-downtime deploys.
5. **Phase 2c**: Single branch. No staging. Feature flags + canary deploys.

Each phase is additive. No big bang migration.

---

## Open Questions

- How do TRONs handle deploy dependencies (e.g., API must deploy before frontend)?
- What's the TRON's authority boundary? Can it decide to skip a deploy?
- How do we handle database migrations in a roll-back scenario?
- Should TRONs have memory of past deploy patterns (ML-style anomaly detection)?
- How does this integrate with 1KH v4 executor phases?
